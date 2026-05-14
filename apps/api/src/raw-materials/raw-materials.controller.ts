import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common'
import { RawMaterialsService } from './raw-materials.service'
import { BomService } from './bom.service'
import {
  CreateMaterialDto, UpdateMaterialDto,
  ReceiveMaterialDto, AdjustMaterialDto, WriteOffMaterialDto,
} from './dto/create-material.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('raw-materials')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class RawMaterialsController {
  constructor(
    private readonly materials: RawMaterialsService,
    private readonly bom: BomService,
  ) {}

  // ── Materials CRUD ───────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materials.create(dto)
  }

  @Get()
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'READ' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.materials.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      category,
      lowStock: lowStock === 'true',
    })
  }

  @Get(':id')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'READ' })
  findOne(@Param('id') id: string) {
    return this.materials.findOne(id)
  }

  @Patch(':id')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materials.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'DELETE' })
  remove(@Param('id') id: string) {
    return this.materials.remove(id)
  }

  // ── Stock operations ─────────────────────────────────────────────────────────

  @Get(':id/movements')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'READ' })
  getMovements(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.materials.getMovements(id, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 30)
  }

  @Post(':id/receive')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceiveMaterialDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.materials.receive(id, dto, req.user.id)
  }

  @Patch(':id/adjust')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  adjust(
    @Param('id') id: string,
    @Body() dto: AdjustMaterialDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.materials.adjust(id, dto, req.user.id)
  }

  @Post(':id/write-off')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  writeOff(
    @Param('id') id: string,
    @Body() dto: WriteOffMaterialDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.materials.writeOff(id, dto, req.user.id)
  }

  // ── BOM ─────────────────────────────────────────────────────────────────────

  @Get('bom/all')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'READ' })
  getBoms(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.bom.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    })
  }

  @Get('bom/:variantId')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'READ' })
  getBom(@Param('variantId') variantId: string) {
    return this.bom.findOrCreateByVariant(variantId)
  }

  @Put('bom/:variantId')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  upsertBom(
    @Param('variantId') variantId: string,
    @Body() body: { lines: { materialId: string; quantityPerUnit: number; notes?: string }[] },
  ) {
    return this.bom.upsertLines(variantId, body.lines)
  }

  @Delete('bom/:variantId/lines/:lineId')
  @RequirePermissions({ module: 'RAW_MATERIALS', action: 'WRITE' })
  removeBomLine(
    @Param('variantId') variantId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.bom.removeLine(variantId, lineId)
  }
}
