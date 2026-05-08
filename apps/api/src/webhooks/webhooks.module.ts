import { Module } from '@nestjs/common'
import { WebhooksController } from './webhooks.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
