import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { FactoryAuthService } from './factory-auth.service'
import { FactoryAuthController } from './factory-auth.controller'
import { FactoryJwtStrategy } from './factory-jwt.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_FACTORY_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FactoryAuthController],
  providers: [FactoryAuthService, FactoryJwtStrategy],
  exports: [FactoryAuthService],
})
export class FactoryAuthModule {}
