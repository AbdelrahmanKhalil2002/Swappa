import { Module } from '@nestjs/common'
import { ManufacturingService } from './manufacturing.service'
import { ManufacturingController } from './manufacturing.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { RawMaterialsModule } from '../raw-materials/raw-materials.module'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [PrismaModule, RawMaterialsModule, SettingsModule],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
