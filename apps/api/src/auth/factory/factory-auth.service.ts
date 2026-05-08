import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import type { FactoryWorker } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { PinLoginDto } from './dto/pin-login.dto'

const DUMMY_HASH = '$2a$12$dummyhashfortimingattackpreventionxxxxxxxxxxxxxxxxxx'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'ag_factory_rt'
const COOKIE_PATH = '/api/v1/auth/factory'

type SafeWorker = Omit<FactoryWorker, 'pin'>

@Injectable()
export class FactoryAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  private stripSensitive(worker: FactoryWorker): SafeWorker {
    const { pin: _pin, ...safe } = worker
    return safe
  }

  private async issueTokens(
    worker: FactoryWorker,
    res: Response,
    oldRawRefreshToken?: string,
  ): Promise<{ accessToken: string; worker: SafeWorker }> {
    if (oldRawRefreshToken) {
      const oldHash = this.hashToken(oldRawRefreshToken)
      await this.prisma.factoryRefreshToken.deleteMany({ where: { tokenHash: oldHash } })
    }

    const rawRefreshToken = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

    await this.prisma.factoryRefreshToken.create({
      data: { tokenHash, factoryWorkerId: worker.id, expiresAt },
    })

    res.cookie(COOKIE_NAME, rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: SEVEN_DAYS_MS,
    })

    const accessToken = await this.jwt.signAsync(
      { sub: worker.id, role: 'factory' },
      {
        secret: this.config.get<string>('JWT_FACTORY_SECRET'),
        expiresIn: '15m',
      },
    )

    return { accessToken, worker: this.stripSensitive(worker) }
  }

  async login(dto: PinLoginDto, res: Response) {
    const worker = await this.prisma.factoryWorker.findUnique({ where: { id: dto.workerId } })

    const hashToCompare = worker?.pin ?? DUMMY_HASH
    const valid = await bcrypt.compare(dto.pin, hashToCompare)

    if (!worker || !valid) {
      throw new UnauthorizedException('Invalid worker ID or PIN')
    }

    if (!worker.isActive) {
      throw new UnauthorizedException('Worker account is deactivated')
    }

    return this.issueTokens(worker, res)
  }

  async refresh(rawTokenFromCookie: string | undefined, res: Response) {
    if (!rawTokenFromCookie) {
      throw new UnauthorizedException('No refresh token')
    }

    const tokenHash = this.hashToken(rawTokenFromCookie)

    const stored = await this.prisma.factoryRefreshToken.findUnique({
      where: { tokenHash },
      include: { factoryWorker: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    return this.issueTokens(stored.factoryWorker, res, rawTokenFromCookie)
  }

  async logout(rawTokenFromCookie: string | undefined, res: Response): Promise<{ message: string }> {
    if (rawTokenFromCookie) {
      const tokenHash = this.hashToken(rawTokenFromCookie)
      await this.prisma.factoryRefreshToken.deleteMany({ where: { tokenHash } })
    }

    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH })

    return { message: 'Logged out successfully' }
  }
}
