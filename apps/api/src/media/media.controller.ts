import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MediaType } from '@prisma/client'
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

  @Get()
  @RequirePermissions({ module: 'MEDIA', action: 'READ' })
  findAll(@Query('type') type?: MediaType, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.media.findAll({ type, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 48 })
  }

  @Post('upload')
  @RequirePermissions({ module: 'MEDIA', action: 'WRITE' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      folder?: string
      alt?: string
      position?: string
      type?: string
      baseShoeId?: string
      heelStyleId?: string
    },
  ) {
    const { key, url } = await this.media.uploadFile(file, body.folder ?? 'products')
    return this.media.save({
      url,
      key,
      alt: body.alt ?? undefined,
      position: body.position ? parseInt(body.position, 10) : 0,
      type: (body.type as MediaType) ?? MediaType.GALLERY,
      baseShoeId: body.baseShoeId,
      heelStyleId: body.heelStyleId,
    })
  }

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
