import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { SaveMediaDto } from './dto/save-media.dto'

@Injectable()
export class MediaService {
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.getOrThrow<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    })
    this.bucket = config.getOrThrow<string>('R2_BUCKET_NAME')
    this.publicUrl = config.getOrThrow<string>('R2_PUBLIC_URL')
  }

  async presign(filename: string, contentType: string, folder = 'products') {
    const ext = filename.split('.').pop() ?? 'jpg'
    const key = `${folder}/${randomUUID()}.${ext}`
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 })
    return { uploadUrl, key, publicUrl: `${this.publicUrl}/${key}` }
  }

  save(dto: SaveMediaDto) {
    return this.prisma.productMedia.create({ data: dto })
  }

  async remove(id: string) {
    const media = await this.prisma.productMedia.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Media not found')
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: media.key }))
    return this.prisma.productMedia.delete({ where: { id } })
  }
}
