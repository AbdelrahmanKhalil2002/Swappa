import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const BOM_INCLUDE = {
  variant: {
    include: {
      baseShoe: { select: { id: true, name: true } },
    },
  },
  lines: {
    include: {
      material: {
        select: { id: true, name: true, sku: true, unit: true, costPerUnit: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

@Injectable()
export class BomService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ page = 1, limit = 30 }: { page?: number; limit?: number }) {
    const [items, total] = await Promise.all([
      this.prisma.bOM.findMany({
        include: BOM_INCLUDE,
        orderBy: { variant: { baseShoe: { name: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bOM.count(),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOrCreateByVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { baseShoe: { select: { id: true, name: true } } },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    return this.prisma.bOM.upsert({
      where: { variantId },
      create: { variantId },
      update: {},
      include: BOM_INCLUDE,
    })
  }

  async upsertLines(
    variantId: string,
    lines: { materialId: string; quantityPerUnit: number; notes?: string }[],
  ) {
    const bom = await this.findOrCreateByVariant(variantId)

    // Delete removed lines, upsert new/updated lines
    const incomingIds = lines.map((l) => l.materialId)
    await this.prisma.bOMLine.deleteMany({
      where: { bomId: bom.id, materialId: { notIn: incomingIds } },
    })

    for (const line of lines) {
      await this.prisma.bOMLine.upsert({
        where: { bomId_materialId: { bomId: bom.id, materialId: line.materialId } },
        create: {
          bomId: bom.id,
          materialId: line.materialId,
          quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit),
          notes: line.notes,
        },
        update: {
          quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit),
          notes: line.notes,
        },
      })
    }

    return this.prisma.bOM.findUnique({ where: { variantId }, include: BOM_INCLUDE })
  }

  async removeLine(variantId: string, lineId: string) {
    const bom = await this.prisma.bOM.findUnique({ where: { variantId } })
    if (!bom) throw new NotFoundException('BOM not found')
    return this.prisma.bOMLine.delete({ where: { id: lineId, bomId: bom.id } })
  }

  // Used by manufacturing to calculate material cost per unit
  async calculateCost(variantId: string): Promise<number> {
    const bom = await this.prisma.bOM.findUnique({
      where: { variantId },
      include: {
        lines: { include: { material: { select: { costPerUnit: true } } } },
      },
    })
    if (!bom) return 0
    return bom.lines.reduce(
      (sum, l) => sum + Number(l.quantityPerUnit) * Number(l.material.costPerUnit),
      0,
    )
  }
}
