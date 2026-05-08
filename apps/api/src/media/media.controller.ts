import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'
import { MediaService } from './media.service'
import { PresignUploadDto } from './dto/presign-upload.dto'
import { SaveMediaDto } from './dto/save-media.dto'

@Controller('media')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  @RequirePermissions({ module: 'MEDIA', action: 'WRITE' })
  presign(@Body() dto: PresignUploadDto) {
    return this.media.presign(dto.filename, dto.contentType, dto.folder)
  }

  @Post()
  @RequirePermissions({ module: 'MEDIA', action: 'WRITE' })
  save(@Body() dto: SaveMediaDto) {
    return this.media.save(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions({ module: 'MEDIA', action: 'DELETE' })
  remove(@Param('id') id: string) {
    return this.media.remove(id)
  }
}
