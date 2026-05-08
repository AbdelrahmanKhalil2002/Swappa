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
import { HeelStylesService } from './heel-styles.service'
import { CreateHeelStyleDto } from './dto/create-heel-style.dto'
import { UpdateHeelStyleDto } from './dto/update-heel-style.dto'

@Controller('catalog/heel-styles')
export class HeelStylesController {
  constructor(private readonly heels: HeelStylesService) {}

  @Get()
  findAll() {
    return this.heels.findAll()
  }

  @Get('id/:id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'READ' })
  findById(@Param('id') id: string) {
    return this.heels.findOne(id)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.heels.findBySlug(slug)
  }

  @Post()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  create(@Body() dto: CreateHeelStyleDto) {
    return this.heels.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'WRITE' })
  update(@Param('id') id: string, @Body() dto: UpdateHeelStyleDto) {
    return this.heels.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  @RequirePermissions({ module: 'CATALOG', action: 'DELETE' })
  remove(@Param('id') id: string) {
    return this.heels.remove(id)
  }
}
