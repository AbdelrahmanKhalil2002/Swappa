import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ProcurementService } from './procurement.service'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto'
import { ReconcileGRDto } from './dto/reconcile-gr.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'
import { SupplierJwtGuard } from '../auth/guards/supplier-jwt.guard'

// ── Admin: Suppliers ──────────────────────────────────────────────────────────

@Controller('procurement/suppliers')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class SuppliersAdminController {
  constructor(private readonly svc: ProcurementService) {}

  @Get()
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAllSuppliers({ page: +( page ?? 1), limit: +(limit ?? 30) })
  }

  @Get(':id')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.svc.findSupplier(id)
  }

  @Post()
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  create(@Body() dto: CreateSupplierDto) {
    return this.svc.createSupplier(dto)
  }

  @Patch(':id')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSupplierDto>) {
    return this.svc.updateSupplier(id, dto)
  }

  @Post(':id/invite')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  regenerateInvite(@Param('id') id: string) {
    return this.svc.regenerateInvite(id)
  }

  @Get(':id/performance')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  performance(@Param('id') id: string) {
    return this.svc.getSupplierPerformance(id)
  }

  @Get(':id/documents')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  documents(@Param('id') id: string) {
    return this.svc.getSupplierDocuments(id)
  }
}

// ── Admin: Purchase Orders ────────────────────────────────────────────────────

@Controller('procurement/orders')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class POAdminController {
  constructor(private readonly svc: ProcurementService) {}

  @Get()
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAllPOs({ page: +(page ?? 1), limit: +(limit ?? 30), supplierId, status: status as any })
  }

  @Get(':id')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.svc.findOnePO(id)
  }

  @Post()
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.svc.createPO(dto, req.user?.sub)
  }

  @Patch(':id/status')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.svc.updatePOStatus(id, body.status as any)
  }

  @Post(':id/receipt')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  createGR(@Param('id') id: string) {
    return this.svc.createGR(id)
  }

  @Patch(':id/receipt/:grId/reconcile')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  reconcile(@Param('grId') grId: string, @Body() dto: ReconcileGRDto) {
    return this.svc.reconcileGR(grId, dto)
  }

  @Patch(':id/receipt/:grId/confirm')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'WRITE' })
  confirm(@Param('grId') grId: string, @Req() req: any) {
    return this.svc.confirmGR(grId, req.user?.sub)
  }
}

// ── Admin: Material cost comparison ──────────────────────────────────────────

@Controller('procurement/materials')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class MaterialCostController {
  constructor(private readonly svc: ProcurementService) {}

  @Get(':materialId/cost-comparison')
  @RequirePermissions({ module: 'PROCUREMENT', action: 'READ' })
  costComparison(@Param('materialId') materialId: string) {
    return this.svc.getMaterialCostComparison(materialId)
  }
}

// ── Supplier Portal ───────────────────────────────────────────────────────────

@Controller('procurement/portal')
@UseGuards(SupplierJwtGuard)
export class SupplierPortalController {
  constructor(private readonly svc: ProcurementService) {}

  @Get('orders')
  myOrders(@Req() req: any) {
    return this.svc.getPortalPOs(req.user.id)
  }

  @Get('orders/:id')
  myOrder(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOnePO(id)
  }

  @Patch('orders/:id/delivery-date')
  updateDeliveryDate(
    @Param('id') id: string,
    @Body() body: { date: string },
    @Req() req: any,
  ) {
    return this.svc.portalUpdateDeliveryDate(id, req.user.id, body.date)
  }

  @Post('documents')
  uploadDocument(
    @Body() body: { poId?: string; name: string; url: string; key: string; docType?: string },
    @Req() req: any,
  ) {
    return this.svc.portalUploadDocument(req.user.id, body.poId, body)
  }

  @Get('documents')
  myDocuments(@Req() req: any) {
    return this.svc.getSupplierDocuments(req.user.id)
  }
}
