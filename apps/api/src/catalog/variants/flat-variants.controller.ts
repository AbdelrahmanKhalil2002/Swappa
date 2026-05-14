import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../../auth/guards/permissions.guard'
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator'
import { VariantsService } from './variants.service'

@Controller('catalog/variants')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions({ module: 'CATALOG', action: 'READ' })
export class FlatVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.variants.findAll({ limit: limit ? parseInt(limit) : 200 })
  }
}
