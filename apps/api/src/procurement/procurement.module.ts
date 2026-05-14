import { Module } from '@nestjs/common'
import { ProcurementService } from './procurement.service'
import {
  SuppliersAdminController,
  POAdminController,
  MaterialCostController,
  SupplierPortalController,
} from './procurement.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { RawMaterialsModule } from '../raw-materials/raw-materials.module'
import { SupplierAuthModule } from '../auth/supplier/supplier-auth.module'

@Module({
  imports: [PrismaModule, RawMaterialsModule, SupplierAuthModule],
  controllers: [
    SuppliersAdminController,
    POAdminController,
    MaterialCostController,
    SupplierPortalController,
  ],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
