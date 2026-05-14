import { Body, Controller, Get, Param, Post, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { ShippingService } from './shipping.service'
import { CreateShipmentDto } from './dto/create-shipment.dto'
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('shipping')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class ShippingController {
  constructor(private readonly svc: ShippingService) {}

  @Get()
  @RequirePermissions({ module: 'SHIPPING', action: 'READ' })
  findAll(
    @Query('status') status?: string,
    @Query('carrier') carrier?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({ status, carrier, page: +(page ?? 1), limit: +(limit ?? 30) })
  }

  @Get(':id')
  @RequirePermissions({ module: 'SHIPPING', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Patch(':id/status')
  @RequirePermissions({ module: 'SHIPPING', action: 'WRITE' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.svc.updateStatus(id, dto)
  }

  @Post('webhook/:carrier')
  handleWebhook(@Param('carrier') carrier: string, @Body() payload: unknown) {
    return this.svc.handleCarrierWebhook(carrier, payload)
  }
}

@Controller('orders/:orderId/shipments')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class OrderShipmentsController {
  constructor(private readonly svc: ShippingService) {}

  @Get()
  @RequirePermissions({ module: 'SHIPPING', action: 'READ' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.svc.findByOrder(orderId)
  }

  @Post()
  @RequirePermissions({ module: 'SHIPPING', action: 'WRITE' })
  create(@Param('orderId') orderId: string, @Body() dto: CreateShipmentDto, @Req() req: { user: { sub: string } }) {
    return this.svc.createShipment(orderId, dto, req.user.sub)
  }

  @Get('rates')
  @RequirePermissions({ module: 'SHIPPING', action: 'READ' })
  rates(@Param('orderId') orderId: string) {
    return this.svc.getCarrierRates(orderId)
  }
}
