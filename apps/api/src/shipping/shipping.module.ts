import { Module } from '@nestjs/common'
import { ShippingService } from './shipping.service'
import { ShippingController, OrderShipmentsController } from './shipping.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController, OrderShipmentsController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
