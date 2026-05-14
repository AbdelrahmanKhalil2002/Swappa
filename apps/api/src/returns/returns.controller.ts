import { Body, Controller, Get, Param, Post, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { ReturnsService } from './returns.service'
import { CreateReturnDto } from './dto/create-return.dto'
import { InspectReturnDto } from './dto/inspect-return.dto'
import { ProcessRefundDto } from './dto/process-refund.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('returns')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly svc: ReturnsService) {}

  @Get('analytics')
  @RequirePermissions({ module: 'RETURNS', action: 'READ' })
  analytics() {
    return this.svc.getAnalytics()
  }

  @Get()
  @RequirePermissions({ module: 'RETURNS', action: 'READ' })
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({ status, type, page: +(page ?? 1), limit: +(limit ?? 30) })
  }

  @Post()
  @RequirePermissions({ module: 'RETURNS', action: 'WRITE' })
  create(@Body() dto: CreateReturnDto, @Req() req: { user: { sub: string } }) {
    return this.svc.create(dto, req.user.sub)
  }

  @Get(':id')
  @RequirePermissions({ module: 'RETURNS', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Patch(':id/receive')
  @RequirePermissions({ module: 'RETURNS', action: 'WRITE' })
  markReceived(@Param('id') id: string) {
    return this.svc.markReceived(id)
  }

  @Post(':id/inspect')
  @RequirePermissions({ module: 'RETURNS', action: 'WRITE' })
  inspect(
    @Param('id') id: string,
    @Body() dto: InspectReturnDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.svc.inspect(id, dto, req.user.sub)
  }

  @Post(':id/refund')
  @RequirePermissions({ module: 'RETURNS', action: 'WRITE' })
  processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.svc.processRefund(id, dto, req.user.sub)
  }

  @Post(':id/exchange')
  @RequirePermissions({ module: 'RETURNS', action: 'WRITE' })
  dispatchExchange(@Param('id') id: string, @Req() req: { user: { sub: string } }) {
    return this.svc.dispatchExchange(id, req.user.sub)
  }
}

@Controller('returns/mine')
@UseGuards(CustomerJwtGuard)
export class CustomerReturnsController {
  constructor(private readonly svc: ReturnsService) {}

  @Get()
  findMine(@Req() req: { user: { sub: string } }) {
    return this.svc.findMine(req.user.sub)
  }
}
