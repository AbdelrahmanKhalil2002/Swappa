import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { FactoryAuthService } from './factory-auth.service'
import { PinLoginDto } from './dto/pin-login.dto'

@Controller('auth/factory')
export class FactoryAuthController {
  constructor(private readonly factoryAuthService: FactoryAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: PinLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.factoryAuthService.login(dto, res)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['ag_factory_rt'] as string | undefined
    return this.factoryAuthService.refresh(token, res)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['ag_factory_rt'] as string | undefined
    return this.factoryAuthService.logout(token, res)
  }
}
