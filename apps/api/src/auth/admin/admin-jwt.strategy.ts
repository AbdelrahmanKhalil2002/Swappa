import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'

interface JwtPayload {
  sub: string
  role: string
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ADMIN_SECRET') ?? '',
    })
  }

  async validate(payload: JwtPayload) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    })

    if (!admin) {
      throw new UnauthorizedException()
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated')
    }

    const { password, inviteToken, inviteExpiresAt, resetToken, resetExpiresAt, ...safeAdmin } =
      admin

    // suppress unused variable warnings
    void password
    void inviteToken
    void inviteExpiresAt
    void resetToken
    void resetExpiresAt

    return {
      ...safeAdmin,
      permissions: admin.role.permissions.map((p) => ({ module: p.module, action: p.action })),
    }
  }
}
