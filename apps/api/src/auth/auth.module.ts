import { Module } from '@nestjs/common'
import { CustomerAuthModule } from './customer/customer-auth.module'
import { AdminAuthModule } from './admin/admin-auth.module'
import { FactoryAuthModule } from './factory/factory-auth.module'
import { SupplierAuthModule } from './supplier/supplier-auth.module'

@Module({
  imports: [CustomerAuthModule, AdminAuthModule, FactoryAuthModule, SupplierAuthModule],
})
export class AuthModule {}
