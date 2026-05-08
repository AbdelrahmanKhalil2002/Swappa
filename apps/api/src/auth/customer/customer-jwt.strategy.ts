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
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    })
  }

  async validate(payload: JwtPayload) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    })

    if (!customer) {
      throw new UnauthorizedException()
    }

    const { password, verifyToken, verifyExpiresAt, resetToken, resetExpiresAt, ...safeCustomer } =
      customer

    // suppress unused variable warnings
    void password
    void verifyToken
    void verifyExpiresAt
    void resetToken
    void resetExpiresAt

    return safeCustomer
  }
}
