import { Module } from '@nestjs/common'
import { BaseShoesController } from './base-shoes.controller'
import { BaseShoesService } from './base-shoes.service'

@Module({
  controllers: [BaseShoesController],
  providers: [BaseShoesService],
  exports: [BaseShoesService],
})
export class BaseShoesModule {}
