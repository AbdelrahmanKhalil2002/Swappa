import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateVariantDto } from './dto/create-variant.dto'
import type { UpdateVariantDto } from './dto/update-variant.dto'

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantDto) {
    const skuConflict = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } })
    if (skuConflict) throw new ConflictException(`SKU "${dto.sku}" already exists`)
    return this.prisma.productVariant.create({ data: dto })
  }

  findByShoe(shoeId: string) {
    return this.prisma.productVariant.findMany({
      where: { baseShoeId: shoeId },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    })
  }

  async findAll({ limit = 200 }: { limit?: number } = {}) {
    const items = await this.prisma.productVariant.findMany({
      include: { baseShoe: { select: { id: true, name: true } } },
      orderBy: [{ baseShoe: { name: 'asc' } }, { size: 'asc' }],
      take: limit,
    })
    return { items }
  }

  async findOne(id: string) {
    const v = await this.prisma.productVariant.findUnique({ where: { id } })
    if (!v) throw new NotFoundException('Variant not found')
    return v
  }

  async update(id: string, dto: UpdateVariantDto) {
    await this.findOne(id)
    const newSku = (dto as { sku?: string }).sku
    if (newSku) {
      const conflict = await this.prisma.productVariant.findFirst({ where: { sku: newSku, NOT: { id } } })
      if (conflict) throw new ConflictException(`SKU "${newSku}" already exists`)
    }
    return this.prisma.productVariant.update({ where: { id }, data: dto as Record<string, unknown> })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.productVariant.delete({ where: { id } })
  }
}
