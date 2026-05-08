import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'swappa-api',
      timestamp: new Date().toISOString(),
    }
  }
}
