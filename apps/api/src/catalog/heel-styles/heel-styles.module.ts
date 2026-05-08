import { Module } from '@nestjs/common'
import { HeelStylesController } from './heel-styles.controller'
import { HeelStylesService } from './heel-styles.service'

@Module({
  controllers: [HeelStylesController],
  providers: [HeelStylesService],
  exports: [HeelStylesService],
})
export class HeelStylesModule {}
