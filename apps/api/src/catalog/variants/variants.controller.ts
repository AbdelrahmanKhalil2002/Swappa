import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../../auth/guards/permissions.guard'
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator'
import { VariantsService } from './variants.service'
import { CreateVariantDto } from './dto/create-variant.dto'
import { UpdateVariantDto } from './dto/update-variant.dto'

@Controller('catalog/shoes/:shoeId/variants')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  findAll(@Param('shoeId') shoeId: string) {
    return this.variants.findByShoe(shoeId)
  }

  @Post()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  create(@Param('shoeId') shoeId: string, @Body() dto: CreateVariantDto) {
    return this.variants.create({ ...dto, baseShoeId: shoeId })
  }

  @Patch(':variantId')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  update(@Param('variantId') id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto)
  }

  @Delete(':variantId')
  @HttpCode(204)
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'DELETE' })
  remove(@Param('variantId') id: string) {
    return this.variants.remove(id)
  }
}
