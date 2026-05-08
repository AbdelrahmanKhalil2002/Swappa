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
import { InventoryService } from './inventory.service'
import { AdjustStockDto, WriteOffDto, StocktakeItemDto } from './dto/adjust-stock.dto'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('inventory')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermissions({ module: 'INVENTORY', action: 'READ' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.inventory.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      lowStock: lowStock === 'true',
    })
  }

  @Get('stocktake')
  @RequirePermissions({ module: 'INVENTORY', action: 'READ' })
  getStocktakeList() {
    return this.inventory.getStocktakeList()
  }

  @Post('stocktake')
  @RequirePermissions({ module: 'INVENTORY', action: 'WRITE' })
  async bulkStocktake(
    @Body() body: { items: StocktakeItemDto[] },
    @Req() req: { user: { id: string } },
  ) {
    const results = await Promise.all(
      body.items.map((item) =>
        this.inventory.stocktake(item.variantId, item.physicalCount, req.user.id),
      ),
    )
    return { updated: results.length }
  }

  @Get(':variantId')
  @RequirePermissions({ module: 'INVENTORY', action: 'READ' })
  findOne(@Param('variantId') variantId: string) {
    return this.inventory.findOne(variantId)
  }

  @Get(':variantId/movements')
  @RequirePermissions({ module: 'INVENTORY', action: 'READ' })
  getMovements(
    @Param('variantId') variantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventory.getMovements(
      variantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    )
  }

  @Post(':variantId/receive')
  @RequirePermissions({ module: 'INVENTORY', action: 'WRITE' })
  receive(
    @Param('variantId') variantId: string,
    @Body() body: { quantity: number; reference?: string },
    @Req() req: { user: { id: string } },
  ) {
    return this.inventory.receive(variantId, body.quantity, {
      reference: body.reference,
      actorId: req.user.id,
    })
  }

  @Patch(':variantId/adjust')
  @RequirePermissions({ module: 'INVENTORY', action: 'WRITE' })
  adjust(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustStockDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.inventory.adjust(variantId, dto.delta, dto.reason, req.user.id)
  }

  @Post(':variantId/write-off')
  @RequirePermissions({ module: 'INVENTORY', action: 'WRITE' })
  writeOff(
    @Param('variantId') variantId: string,
    @Body() dto: WriteOffDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.inventory.writeOff(variantId, dto.quantity, dto.reason, req.user.id)
  }
}
