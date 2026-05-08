import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { writeFile, unlink } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { MediaType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { SaveMediaDto } from './dto/save-media.dto'

@Injectable()
export class MediaService {
  private readonly s3: S3Client | null
  private readonly bucket: string
  private readonly publicUrl: string
  private readonly isLocalMode: boolean
  private readonly uploadsDir!: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const r2AccountId = config.get<string>('R2_ACCOUNT_ID') ?? ''
    this.isLocalMode = !r2AccountId || r2AccountId === '...'

    if (this.isLocalMode) {
      this.s3 = null
      this.bucket = ''
      this.publicUrl = config.get<string>('API_URL') ?? 'http://localhost:4000'
      this.uploadsDir = join(process.cwd(), 'uploads')
      if (!existsSync(this.uploadsDir)) mkdirSync(this.uploadsDir, { recursive: true })
    } else {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
        },
      })
      this.bucket = config.getOrThrow<string>('R2_BUCKET_NAME')
      this.publicUrl = config.getOrThrow<string>('R2_PUBLIC_URL')
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'products') {
    const ext = file.originalname.split('.').pop() ?? 'jpg'
    const filename = `${randomUUID()}.${ext}`

    if (this.isLocalMode) {
      const localPath = join(this.uploadsDir, filename)
      await writeFile(localPath, file.buffer)
      return { key: filename, url: `${this.publicUrl}/uploads/${filename}` }
    }

    const key = `${folder}/${filename}`
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    )
    return { key, url: `${this.publicUrl}/${key}` }
  }

  async presign(filename: string, contentType: string, folder = 'products') {
    if (this.isLocalMode) {
      throw new Error('Presigned URLs are not supported in local storage mode.')
    }
    const ext = filename.split('.').pop() ?? 'jpg'
    const key = `${folder}/${randomUUID()}.${ext}`
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn: 300 })
    return { uploadUrl, key, publicUrl: `${this.publicUrl}/${key}` }
  }

  async findAll({ type, page = 1, limit = 48 }: { type?: MediaType; page?: number; limit?: number }) {
    const where = type ? { type } : {}
    const [items, total] = await Promise.all([
      this.prisma.productMedia.findMany({
        where,
        include: {
          baseShoe: { select: { id: true, name: true, slug: true } },
          heelStyle: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productMedia.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  save(dto: SaveMediaDto) {
    return this.prisma.productMedia.create({ data: dto })
  }

  async remove(id: string) {
    const media = await this.prisma.productMedia.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Media not found')

    if (this.isLocalMode) {
      const localPath = join(this.uploadsDir, media.key)
      if (existsSync(localPath)) await unlink(localPath)
    } else {
      await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: media.key }))
    }

    return this.prisma.productMedia.delete({ where: { id } })
  }
}
