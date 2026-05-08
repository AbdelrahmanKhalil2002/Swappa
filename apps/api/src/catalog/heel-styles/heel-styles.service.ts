import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateHeelStyleDto } from './dto/create-heel-style.dto'
import type { UpdateHeelStyleDto } from './dto/update-heel-style.dto'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const HEEL_INCLUDE = {
  media: { orderBy: { position: 'asc' as const } },
  _count: { select: { compatibility: true } },
}

@Injectable()
export class HeelStylesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHeelStyleDto) {
    const slug = dto.slug ?? toSlug(dto.name)
    const existing = await this.prisma.heelStyle.findUnique({ where: { slug } })
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`)
    return this.prisma.heelStyle.create({
      data: {
        ...dto,
        slug,
        addedPrice: new Prisma.Decimal(dto.addedPrice ?? 0),
      },
      include: HEEL_INCLUDE,
    })
  }

  findAll() {
    return this.prisma.heelStyle.findMany({ include: HEEL_INCLUDE, orderBy: { name: 'asc' } })
  }

  async findBySlug(slug: string) {
    const heel = await this.prisma.heelStyle.findUnique({
      where: { slug },
      include: { media: { orderBy: { position: 'asc' as const } } },
    })
    if (!heel) throw new NotFoundException('Heel style not found')
    return heel
  }

  async findOne(id: string) {
    const heel = await this.prisma.heelStyle.findUnique({ where: { id }, include: HEEL_INCLUDE })
    if (!heel) throw new NotFoundException('Heel style not found')
    return heel
  }

  async update(id: string, dto: UpdateHeelStyleDto) {
    await this.findOne(id)
    const newSlug = (dto as { slug?: string }).slug
    if (newSlug) {
      const conflict = await this.prisma.heelStyle.findFirst({ where: { slug: newSlug, NOT: { id } } })
      if (conflict) throw new ConflictException(`Slug "${newSlug}" is already taken`)
    }
    const { addedPrice, ...rest } = dto as Record<string, unknown>
    const data: Prisma.HeelStyleUpdateInput = { ...rest }
    if (addedPrice !== undefined) data.addedPrice = new Prisma.Decimal(addedPrice as number)
    return this.prisma.heelStyle.update({ where: { id }, data, include: HEEL_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.heelStyle.delete({ where: { id } })
  }
}
