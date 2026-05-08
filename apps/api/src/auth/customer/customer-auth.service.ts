import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import type { Customer } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from '../../mail/mail.service'
import type { RegisterDto } from './dto/register.dto'
import type { LoginDto } from './dto/login.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'

type SafeCustomer = Omit<
  Customer,
  'password' | 'verifyToken' | 'verifyExpiresAt' | 'resetToken' | 'resetExpiresAt'
>

const DUMMY_HASH = '$2a$12$dummyhashfortimingattackpreventionxxxxxxxxxxxxxxxxxx'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'ag_customer_rt'
const COOKIE_PATH = '/api/v1/auth/customer'

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  private stripSensitive(customer: Customer): SafeCustomer {
    const {
      password: _p,
      verifyToken: _vt,
      verifyExpiresAt: _ve,
      resetToken: _rt,
      resetExpiresAt: _re,
      ...safe
    } = customer
    return safe
  }

  private async issueTokens(
    customer: Customer,
    res: Response,
    oldRawRefreshToken?: string,
  ): Promise<{ accessToken: string; customer: SafeCustomer }> {
    // Rotate: delete old refresh token
    if (oldRawRefreshToken) {
      const oldHash = this.hashToken(oldRawRefreshToken)
      await this.prisma.customerRefreshToken.deleteMany({ where: { tokenHash: oldHash } })
    }

    // Generate new refresh token
    const rawRefreshToken = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

    await this.prisma.customerRefreshToken.create({
      data: { tokenHash, customerId: customer.id, expiresAt },
    })

    // Set httpOnly cookie
    res.cookie(COOKIE_NAME, rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: SEVEN_DAYS_MS,
    })

    // Sign access token
    const accessToken = await this.jwt.signAsync(
      { sub: customer.id, role: 'customer' },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    )

    return { accessToken, customer: this.stripSensitive(customer) }
  }

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('Email already in use')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12)

    // Verification token: store hash, send raw
    const rawVerifyToken = randomBytes(32).toString('hex')
    const verifyTokenHash = this.hashToken(rawVerifyToken)
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        verifyToken: verifyTokenHash,
        verifyExpiresAt,
      },
    })

    await this.mail.sendVerificationEmail(customer.email, customer.firstName, rawVerifyToken)

    return this.issueTokens(customer, res)
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token)

    const customer = await this.prisma.customer.findFirst({
      where: {
        verifyToken: tokenHash,
        verifyExpiresAt: { gt: new Date() },
      },
    })

    if (!customer) {
      throw new BadRequestException('Invalid or expired verification token')
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpiresAt: null,
      },
    })

    return { message: 'Email verified successfully' }
  }

  async login(dto: LoginDto, res: Response) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email } })

    // Timing attack prevention: always compare
    const hashToCompare = customer?.password ?? DUMMY_HASH
    const valid = await bcrypt.compare(dto.password, hashToCompare)

    if (!customer || !valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.issueTokens(customer, res)
  }

  async refresh(rawTokenFromCookie: string | undefined, res: Response) {
    if (!rawTokenFromCookie) {
      throw new UnauthorizedException('No refresh token')
    }

    const tokenHash = this.hashToken(rawTokenFromCookie)

    const stored = await this.prisma.customerRefreshToken.findUnique({
      where: { tokenHash },
      include: { customer: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    return this.issueTokens(stored.customer, res, rawTokenFromCookie)
  }

  async logout(rawTokenFromCookie: string | undefined, res: Response): Promise<{ message: string }> {
    if (rawTokenFromCookie) {
      const tokenHash = this.hashToken(rawTokenFromCookie)
      await this.prisma.customerRefreshToken.deleteMany({ where: { tokenHash } })
    }

    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH })

    return { message: 'Logged out successfully' }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const message = 'If an account exists, a reset link has been sent.'

    const customer = await this.prisma.customer.findUnique({ where: { email } })
    if (!customer) {
      // Silent return to prevent enumeration
      return { message }
    }

    const rawResetToken = randomBytes(32).toString('hex')
    const resetTokenHash = this.hashToken(rawResetToken)
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { resetToken: resetTokenHash, resetExpiresAt },
    })

    await this.mail.sendPasswordResetEmail(customer.email, customer.firstName, rawResetToken, false)

    return { message }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token)

    const customer = await this.prisma.customer.findFirst({
      where: {
        resetToken: tokenHash,
        resetExpiresAt: { gt: new Date() },
      },
    })

    if (!customer) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12)

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpiresAt: null,
      },
    })

    // Invalidate all refresh tokens for security
    await this.prisma.customerRefreshToken.deleteMany({ where: { customerId: customer.id } })

    return { message: 'Password reset successfully' }
  }
}
