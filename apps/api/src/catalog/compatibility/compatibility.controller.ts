import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../../auth/guards/permissions.guard'
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator'
import { CompatibilityService } from './compatibility.service'
import { BulkUpdateCompatibilityDto, CompatibilityItemDto } from './dto/update-compatibility.dto'

@Controller('catalog/shoes/:shoeId/compatibility')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class CompatibilityController {
  constructor(private readonly compat: CompatibilityService) {}

  @Get()
  @RequirePermissions({ module: 'CATALOG', action: 'READ' })
  findForShoe(@Param('shoeId') shoeId: string) {
    return this.compat.findForShoe(shoeId)
  }

  @Put('one')
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  upsertOne(@Param('shoeId') shoeId: string, @Body() dto: CompatibilityItemDto) {
    return this.compat.upsertOne(shoeId, dto)
  }

  @Put('bulk')
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  bulkUpdate(@Param('shoeId') shoeId: string, @Body() dto: BulkUpdateCompatibilityDto) {
    return this.compat.bulkUpdate(shoeId, dto)
  }

  @Post('bulk-enable')
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  bulkEnable(@Param('shoeId') shoeId: string) {
    return this.compat.bulkEnable(shoeId)
  }
}
