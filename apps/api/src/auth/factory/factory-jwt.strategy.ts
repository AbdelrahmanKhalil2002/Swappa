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
export class FactoryJwtStrategy extends PassportStrategy(Strategy, 'factory-jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_FACTORY_SECRET') ?? '',
    })
  }

  async validate(payload: JwtPayload) {
    const worker = await this.prisma.factoryWorker.findUnique({
      where: { id: payload.sub },
    })

    if (!worker) {
      throw new UnauthorizedException()
    }

    if (!worker.isActive) {
      throw new UnauthorizedException('Worker account is deactivated')
    }

    const { pin, ...safeWorker } = worker
    void pin

    return safeWorker
  }
}
