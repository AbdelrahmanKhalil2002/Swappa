import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import type { AdminUser } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from '../../mail/mail.service'
import type { AdminLoginDto } from './dto/admin-login.dto'
import type { AcceptInviteDto } from './dto/accept-invite.dto'
import type { AdminForgotPasswordDto } from './dto/forgot-password.dto'
import type { AdminResetPasswordDto } from './dto/reset-password.dto'
import type { InviteAdminDto } from './dto/invite-admin.dto'

const DUMMY_HASH = '$2a$12$dummyhashfortimingattackpreventionxxxxxxxxxxxxxxxxxx'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'ag_admin_rt'
const COOKIE_PATH = '/api/v1/auth/admin'

type SafeAdmin = Omit<
  AdminUser,
  'password' | 'inviteToken' | 'inviteExpiresAt' | 'resetToken' | 'resetExpiresAt'
>

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  private stripSensitive(admin: AdminUser): SafeAdmin {
    const {
      password: _p,
      inviteToken: _it,
      inviteExpiresAt: _ie,
      resetToken: _rt,
      resetExpiresAt: _re,
      ...safe
    } = admin
    return safe
  }

  private async issueTokens(
    admin: AdminUser,
    res: Response,
    oldRawRefreshToken?: string,
  ): Promise<{ accessToken: string; admin: SafeAdmin }> {
    if (oldRawRefreshToken) {
      const oldHash = this.hashToken(oldRawRefreshToken)
      await this.prisma.adminRefreshToken.deleteMany({ where: { tokenHash: oldHash } })
    }

    const rawRefreshToken = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

    await this.prisma.adminRefreshToken.create({
      data: { tokenHash, adminUserId: admin.id, expiresAt },
    })

    res.cookie(COOKIE_NAME, rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: SEVEN_DAYS_MS,
    })

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, role: 'admin' },
      {
        secret: this.config.get<string>('JWT_ADMIN_SECRET'),
        expiresIn: '15m',
      },
    )

    return { accessToken, admin: this.stripSensitive(admin) }
  }

  async login(dto: AdminLoginDto, res: Response) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } })

    const hashToCompare = admin?.password ?? DUMMY_HASH
    const valid = await bcrypt.compare(dto.password, hashToCompare)

    if (!admin || !valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!admin.isActive) {
      throw new ForbiddenException('Account is deactivated')
    }

    return this.issueTokens(admin, res)
  }

  async refresh(rawTokenFromCookie: string | undefined, res: Response) {
    if (!rawTokenFromCookie) {
      throw new UnauthorizedException('No refresh token')
    }

    const tokenHash = this.hashToken(rawTokenFromCookie)

    const stored = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
      include: { adminUser: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    return this.issueTokens(stored.adminUser, res, rawTokenFromCookie)
  }

  async logout(rawTokenFromCookie: string | undefined, res: Response): Promise<{ message: string }> {
    if (rawTokenFromCookie) {
      const tokenHash = this.hashToken(rawTokenFromCookie)
      await this.prisma.adminRefreshToken.deleteMany({ where: { tokenHash } })
    }

    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH })

    return { message: 'Logged out successfully' }
  }

  async inviteAdmin(dto: InviteAdminDto, invitedBy: string): Promise<{ message: string }> {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } })
    if (!role) {
      throw new NotFoundException('Role not found')
    }

    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('Email already in use')
    }

    const rawInviteToken = randomBytes(32).toString('hex')
    const inviteTokenHash = this.hashToken(rawInviteToken)
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

    await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        roleId: dto.roleId,
        inviteToken: inviteTokenHash,
        inviteExpiresAt,
        isActive: false,
      },
    })

    await this.mail.sendAdminInviteEmail(dto.email, invitedBy, rawInviteToken)

    return { message: 'Invitation sent' }
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token)

    const admin = await this.prisma.adminUser.findFirst({
      where: {
        inviteToken: tokenHash,
        inviteExpiresAt: { gt: new Date() },
      },
    })

    if (!admin) {
      throw new BadRequestException('Invalid or expired invite token')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12)

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashedPassword,
        isActive: true,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    })

    return { message: 'Account activated successfully' }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const message = 'If an account exists, a reset link has been sent.'
    const adminUrl = this.config.get<string>('ADMIN_URL') ?? 'http://localhost:3001'

    const admin = await this.prisma.adminUser.findUnique({ where: { email } })
    if (!admin) {
      return { message }
    }

    const rawResetToken = randomBytes(32).toString('hex')
    const resetTokenHash = this.hashToken(rawResetToken)
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { resetToken: resetTokenHash, resetExpiresAt },
    })

    // Admin reset goes to admin URL
    const firstName = admin.firstName ?? 'Admin'
    await this.mail.sendPasswordResetEmail(admin.email, firstName, rawResetToken, true)

    void adminUrl

    return { message }
  }

  async resetPassword(dto: AdminResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token)

    const admin = await this.prisma.adminUser.findFirst({
      where: {
        resetToken: tokenHash,
        resetExpiresAt: { gt: new Date() },
      },
    })

    if (!admin) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12)

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpiresAt: null,
      },
    })

    await this.prisma.adminRefreshToken.deleteMany({ where: { adminUserId: admin.id } })

    return { message: 'Password reset successfully' }
  }

  async listAdminUsers() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deactivateAdminUser(id: string): Promise<{ message: string }> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } })
    if (!admin) {
      throw new NotFoundException('Admin user not found')
    }

    await this.prisma.adminUser.update({ where: { id }, data: { isActive: false } })
    await this.prisma.adminRefreshToken.deleteMany({ where: { adminUserId: id } })

    return { message: 'Admin user deactivated' }
  }
}
