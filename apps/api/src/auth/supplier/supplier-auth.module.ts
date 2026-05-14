import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { SupplierAuthService } from './supplier-auth.service'
import { SupplierAuthController } from './supplier-auth.controller'
import { SupplierJwtStrategy } from './supplier-jwt.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SUPPLIER_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SupplierAuthController],
  providers: [SupplierAuthService, SupplierJwtStrategy],
  exports: [SupplierAuthService],
})
export class SupplierAuthModule {}
