import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateCategoryDto } from './dto/create-category.dto'
import type { UpdateCategoryDto } from './dto/update-category.dto'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CAT_INCLUDE = {
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { children: true, baseShoes: true } },
} as const

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ?? toSlug(dto.name)
    const existing = await this.prisma.category.findUnique({ where: { slug } })
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`)
    return this.prisma.category.create({
      data: { name: dto.name, slug, description: dto.description, parentId: dto.parentId },
      include: CAT_INCLUDE,
    })
  }

  findAll() {
    return this.prisma.category.findMany({
      include: CAT_INCLUDE,
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { baseShoes: true } },
      },
    })
    if (!cat) throw new NotFoundException('Category not found')
    return cat
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id)
    const newSlug = (dto as { slug?: string }).slug
    if (newSlug) {
      const conflict = await this.prisma.category.findFirst({ where: { slug: newSlug, NOT: { id } } })
      if (conflict) throw new ConflictException(`Slug "${newSlug}" is already taken`)
    }
    return this.prisma.category.update({
      where: { id },
      data: dto as Record<string, unknown>,
      include: CAT_INCLUDE,
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.category.delete({ where: { id } })
  }
}
