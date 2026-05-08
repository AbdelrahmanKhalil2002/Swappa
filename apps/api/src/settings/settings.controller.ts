import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('settings')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions({ module: 'SETTINGS', action: 'READ' })
  getAll() {
    return this.settings.getAll()
  }

  @Patch()
  @RequirePermissions({ module: 'SETTINGS', action: 'WRITE' })
  update(@Body() body: Record<string, string>) {
    return this.settings.setMany(body)
  }
}
