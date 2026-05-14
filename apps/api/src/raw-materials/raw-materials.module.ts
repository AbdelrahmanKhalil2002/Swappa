import { Module } from '@nestjs/common'
import { RawMaterialsService } from './raw-materials.service'
import { BomService } from './bom.service'
import { RawMaterialsController } from './raw-materials.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [RawMaterialsController],
  providers: [RawMaterialsService, BomService],
  exports: [RawMaterialsService, BomService],
})
export class RawMaterialsModule {}
