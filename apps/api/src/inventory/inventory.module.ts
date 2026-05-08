import { Module } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { InventoryController } from './inventory.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
