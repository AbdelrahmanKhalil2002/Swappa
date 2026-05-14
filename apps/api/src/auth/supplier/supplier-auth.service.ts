import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import type { Supplier } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { SupplierLoginDto } from './dto/supplier-login.dto'
import type { AcceptSupplierInviteDto } from './dto/accept-supplier-invite.dto'

const DUMMY_HASH = '$2a$12$dummyhashfortimingattackpreventionxxxxxxxxxxxxxxxxxx'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'ag_supplier_rt'
const COOKIE_PATH = '/api/v1/auth/supplier'

type SafeSupplier = Omit<
  Supplier,
  'password' | 'inviteToken' | 'inviteExpiresAt' | 'resetToken' | 'resetExpiresAt'
>

@Injectable()
export class SupplierAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex')
  }

  private strip(s: Supplier): SafeSupplier {
    const { password: _p, inviteToken: _it, inviteExpiresAt: _ie, resetToken: _rt, resetExpiresAt: _re, ...safe } = s
    return safe
  }

  private async issueTokens(supplier: Supplier, res: Response, oldRaw?: string) {
    if (oldRaw) {
      await this.prisma.supplierRefreshToken.deleteMany({ where: { tokenHash: this.hashToken(oldRaw) } })
    }

    const rawRefresh = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

    await this.prisma.supplierRefreshToken.create({
      data: { tokenHash: this.hashToken(rawRefresh), supplierId: supplier.id, expiresAt },
    })

    res.cookie(COOKIE_NAME, rawRefresh, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: SEVEN_DAYS_MS,
    })

    const accessToken = await this.jwt.signAsync(
      { sub: supplier.id, role: 'supplier' },
      { secret: this.config.get<string>('JWT_SUPPLIER_SECRET'), expiresIn: '15m' },
    )

    return { accessToken, supplier: this.strip(supplier) }
  }

  async login(dto: SupplierLoginDto, res: Response) {
    const supplier = await this.prisma.supplier.findUnique({ where: { contactEmail: dto.email } })
    const hashToCompare = supplier?.password ?? DUMMY_HASH
    const valid = await bcrypt.compare(dto.password, hashToCompare)

    if (!supplier || !valid || !supplier.password) {
      throw new UnauthorizedException('Invalid email or password')
    }
    if (!supplier.isActive) throw new UnauthorizedException('Supplier account is deactivated')

    return this.issueTokens(supplier, res)
  }

  async acceptInvite(dto: AcceptSupplierInviteDto, res: Response) {
    const tokenHash = this.hashToken(dto.token)
    const supplier = await this.prisma.supplier.findFirst({
      where: { inviteToken: tokenHash, inviteExpiresAt: { gt: new Date() } },
    })
    if (!supplier) throw new BadRequestException('Invite token is invalid or expired')

    const hashed = await bcrypt.hash(dto.password, 12)
    const updated = await this.prisma.supplier.update({
      where: { id: supplier.id },
      data: { password: hashed, inviteToken: null, inviteExpiresAt: null },
    })

    return this.issueTokens(updated, res)
  }

  async refresh(rawToken: string | undefined, res: Response) {
    if (!rawToken) throw new UnauthorizedException('No refresh token')
    const stored = await this.prisma.supplierRefreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { supplier: true },
    })
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Session expired')
    return this.issueTokens(stored.supplier, res, rawToken)
  }

  async logout(rawToken: string | undefined, res: Response) {
    if (rawToken) {
      await this.prisma.supplierRefreshToken.deleteMany({ where: { tokenHash: this.hashToken(rawToken) } })
    }
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH })
    return { message: 'Logged out' }
  }

  // Called by ProcurementService when admin creates a supplier
  async generateInviteToken(supplierId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { inviteToken: this.hashToken(raw), inviteExpiresAt: expiresAt },
    })
    return raw
  }

  async validateInviteToken(token: string) {
    const tokenHash = this.hashToken(token)
    const supplier = await this.prisma.supplier.findFirst({
      where: { inviteToken: tokenHash, inviteExpiresAt: { gt: new Date() } },
    })
    if (!supplier) throw new NotFoundException('Invite token invalid or expired')
    return { supplierId: supplier.id, name: supplier.name, email: supplier.contactEmail }
  }
}
