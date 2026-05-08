import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateBaseShoeDto } from './dto/create-base-shoe.dto'
import type { UpdateBaseShoeDto } from './dto/update-base-shoe.dto'
import type { ListShoesDto } from './dto/list-shoes.dto'
import { Prisma } from '@prisma/client'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SHOE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  media: { orderBy: { position: 'asc' as const } },
  _count: { select: { variants: true, compatibility: true } },
}

@Injectable()
export class BaseShoesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBaseShoeDto) {
    const slug = dto.slug ?? toSlug(dto.name)
    const existing = await this.prisma.baseShoe.findUnique({ where: { slug } })
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`)
    return this.prisma.baseShoe.create({
      data: { ...dto, slug, basePrice: new Prisma.Decimal(dto.basePrice) },
      include: SHOE_INCLUDE,
    })
  }

  async findAll(query: ListShoesDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 24
    const where: Prisma.BaseShoeWhereInput = {}
    if (query.status) where.status = query.status
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' }
    if (query.heelType) {
      where.compatibility = { some: { isCompatible: true, heelStyle: { type: query.heelType } } }
    }

    const [items, total] = await Promise.all([
      this.prisma.baseShoe.findMany({
        where,
        include: SHOE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.baseShoe.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findBySlug(slug: string) {
    const shoe = await this.prisma.baseShoe.findUnique({
      where: { slug },
      include: {
        ...SHOE_INCLUDE,
        compatibility: {
          where: { isCompatible: true },
          include: {
            heelStyle: {
              include: { media: { orderBy: { position: 'asc' as const }, take: 1 } },
            },
          },
        },
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
      },
    })
    if (!shoe) throw new NotFoundException('Shoe not found')
    return shoe
  }

  async findOne(id: string) {
    const shoe = await this.prisma.baseShoe.findUnique({
      where: { id },
      include: {
        ...SHOE_INCLUDE,
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
      },
    })
    if (!shoe) throw new NotFoundException('Shoe not found')
    return shoe
  }

  async update(id: string, dto: UpdateBaseShoeDto) {
    await this.findOne(id)
    const newSlug = (dto as { slug?: string }).slug
    if (newSlug) {
      const conflict = await this.prisma.baseShoe.findFirst({ where: { slug: newSlug, NOT: { id } } })
      if (conflict) throw new ConflictException(`Slug "${newSlug}" is already taken`)
    }
    const { basePrice, ...rest } = dto as Record<string, unknown>
    const data: Prisma.BaseShoeUpdateInput = { ...rest }
    if (basePrice !== undefined) data.basePrice = new Prisma.Decimal(basePrice as number)
    return this.prisma.baseShoe.update({ where: { id }, data, include: SHOE_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.baseShoe.delete({ where: { id } })
  }
}
