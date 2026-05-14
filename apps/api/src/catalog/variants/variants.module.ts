import { Module } from '@nestjs/common'
import { VariantsController } from './variants.controller'
import { FlatVariantsController } from './flat-variants.controller'
import { VariantsService } from './variants.service'

@Module({
  controllers: [VariantsController, FlatVariantsController],
  providers: [VariantsService],
  exports: [VariantsService],
})
export class VariantsModule {}
