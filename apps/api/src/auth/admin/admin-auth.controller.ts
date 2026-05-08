import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AdminAuthService } from './admin-auth.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { AdminForgotPasswordDto } from './dto/forgot-password.dto'
import { AdminResetPasswordDto } from './dto/reset-password.dto'
import { AcceptInviteDto } from './dto/accept-invite.dto'
import { InviteAdminDto } from './dto/invite-admin.dto'
import { AdminJwtGuard } from '../guards/admin-jwt.guard'
import { PermissionsGuard } from '../guards/permissions.guard'
import { RequirePermissions } from '../decorators/require-permissions.decorator'
import { CurrentAdmin } from '../decorators/current-admin.decorator'
import { AdminModule, AdminAction } from '@prisma/client'

interface AdminUserContext {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminAuthService.login(dto, res)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['ag_admin_rt'] as string | undefined
    return this.adminAuthService.refresh(token, res)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['ag_admin_rt'] as string | undefined
    return this.adminAuthService.logout(token, res)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(dto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.adminAuthService.resetPassword(dto)
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.adminAuthService.acceptInvite(dto)
  }

  @Post('invite')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: AdminModule.HR, action: AdminAction.WRITE })
  invite(
    @Body() dto: InviteAdminDto,
    @CurrentAdmin() admin: AdminUserContext,
  ) {
    const inviterName = `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim() || admin.email
    return this.adminAuthService.inviteAdmin(dto, inviterName)
  }
}

@Controller('admin/users')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get()
  @RequirePermissions({ module: AdminModule.HR, action: AdminAction.READ })
  listUsers() {
    return this.adminAuthService.listAdminUsers()
  }

  @Patch(':id/deactivate')
  @RequirePermissions({ module: AdminModule.HR, action: AdminAction.WRITE })
  deactivateUser(@Param('id') id: string) {
    return this.adminAuthService.deactivateAdminUser(id)
  }
}
