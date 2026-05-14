import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ManufacturingService } from './manufacturing.service'
import { CreateProductionOrderDto } from './dto/create-production-order.dto'
import { AdvanceStageDto } from './dto/advance-stage.dto'
import { SubmitQCDto } from './dto/submit-qc.dto'
import { ReviewQCDto } from './dto/review-qc.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'
import { FactoryJwtGuard } from '../auth/guards/factory-jwt.guard'

@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly manufacturing: ManufacturingService) {}

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Get()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'MANUFACTURING', action: 'READ' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.manufacturing.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      status: status as any,
    })
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'MANUFACTURING', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.manufacturing.findOne(id)
  }

  @Post()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'MANUFACTURING', action: 'WRITE' })
  create(@Body() dto: CreateProductionOrderDto, @Req() req: any) {
    return this.manufacturing.create(dto, req.user?.sub)
  }

  @Patch(':id/cancel')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'MANUFACTURING', action: 'WRITE' })
  cancel(@Param('id') id: string) {
    return this.manufacturing.cancel(id)
  }

  @Patch(':id/qc/review')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'QUALITY_CONTROL', action: 'WRITE' })
  reviewQC(@Param('id') id: string, @Body() dto: ReviewQCDto, @Req() req: any) {
    return this.manufacturing.reviewQC(id, dto, req.user?.sub)
  }

  // ── Factory worker endpoints (PIN JWT) ───────────────────────────────────

  @Get('factory/orders')
  @UseGuards(FactoryJwtGuard)
  factoryList(@Query('status') status?: string) {
    return this.manufacturing.findAll({ limit: 50, status: status as any })
  }

  @Get('factory/orders/:id')
  @UseGuards(FactoryJwtGuard)
  factoryFindOne(@Param('id') id: string) {
    return this.manufacturing.findOne(id)
  }

  @Patch('factory/orders/:id/advance')
  @UseGuards(FactoryJwtGuard)
  advanceStage(@Param('id') id: string, @Body() dto: AdvanceStageDto, @Req() req: any) {
    return this.manufacturing.advanceStage(id, dto, req.user?.sub)
  }

  @Post('factory/orders/:id/qc/submit')
  @UseGuards(FactoryJwtGuard)
  submitQC(@Param('id') id: string, @Body() dto: SubmitQCDto, @Req() req: any) {
    return this.manufacturing.submitQC(id, dto, req.user?.sub)
  }
}
