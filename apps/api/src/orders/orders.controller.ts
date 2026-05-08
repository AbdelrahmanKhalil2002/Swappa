import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ── Customer ────────────────────────────────────────────────────────────────

  @Get('mine')
  @UseGuards(CustomerJwtGuard)
  findMine(@Req() req: { user: { id: string } }) {
    return this.orders.findMine(req.user.id)
  }

  @Get('mine/:id')
  @UseGuards(CustomerJwtGuard)
  findMineById(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.orders.findMineById(req.user.id, id)
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'ORDERS', action: 'READ' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
      status,
      search,
    })
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'ORDERS', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id)
  }

  @Patch(':id/status')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'ORDERS', action: 'WRITE' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.orders.updateStatus(id, body.status)
  }
}
