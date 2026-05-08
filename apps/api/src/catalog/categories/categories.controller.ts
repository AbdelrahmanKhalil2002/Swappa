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
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id)
  }

  @Post()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'DELETE' })
  remove(@Param('id') id: string) {
    return this.categories.remove(id)
  }
}
