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
export class SupplierJwtStrategy extends PassportStrategy(Strategy, 'supplier-jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SUPPLIER_SECRET') ?? '',
    })
  }

  async validate(payload: JwtPayload) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: payload.sub } })
    if (!supplier || !supplier.isActive) throw new UnauthorizedException()
    const { password, inviteToken, inviteExpiresAt, resetToken, resetExpiresAt, ...safe } = supplier
    void password; void inviteToken; void inviteExpiresAt; void resetToken; void resetExpiresAt
    return safe
  }
}
