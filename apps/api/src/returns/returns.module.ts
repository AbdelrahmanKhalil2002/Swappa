import { Module } from '@nestjs/common'
import { ReturnsService } from './returns.service'
import { ReturnsController, CustomerReturnsController } from './returns.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [ReturnsController, CustomerReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
