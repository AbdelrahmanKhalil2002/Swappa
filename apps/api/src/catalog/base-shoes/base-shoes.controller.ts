import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../../auth/guards/permissions.guard'
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator'
import { BaseShoesService } from './base-shoes.service'
import { CreateBaseShoeDto } from './dto/create-base-shoe.dto'
import { UpdateBaseShoeDto } from './dto/update-base-shoe.dto'
import { ListShoesDto } from './dto/list-shoes.dto'

@Controller('catalog/shoes')
export class BaseShoesController {
  constructor(private readonly shoes: BaseShoesService) {}

  @Get()
  findAll(@Query() query: ListShoesDto) {
    return this.shoes.findAll(query)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.shoes.findBySlug(slug)
  }

  @Post()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  create(@Body() dto: CreateBaseShoeDto) {
    return this.shoes.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  update(@Param('id') id: string, @Body() dto: UpdateBaseShoeDto) {
    return this.shoes.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'DELETE' })
  remove(@Param('id') id: string) {
    return this.shoes.remove(id)
  }
}
