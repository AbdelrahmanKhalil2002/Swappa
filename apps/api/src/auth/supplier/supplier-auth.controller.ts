import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { SupplierAuthService } from './supplier-auth.service'
import { SupplierLoginDto } from './dto/supplier-login.dto'
import { AcceptSupplierInviteDto } from './dto/accept-supplier-invite.dto'

@Controller('auth/supplier')
export class SupplierAuthController {
  constructor(private readonly svc: SupplierAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: SupplierLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.svc.login(dto, res)
  }

  @Get('invite')
  validateInvite(@Query('token') token: string) {
    return this.svc.validateInviteToken(token)
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptSupplierInviteDto, @Res({ passthrough: true }) res: Response) {
    return this.svc.acceptInvite(dto, res)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.svc.refresh(req.cookies['ag_supplier_rt'], res)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.svc.logout(req.cookies['ag_supplier_rt'], res)
  }
}
