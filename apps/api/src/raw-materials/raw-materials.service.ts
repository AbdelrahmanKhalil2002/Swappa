import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type {
  CreateMaterialDto,
  UpdateMaterialDto,
  ReceiveMaterialDto,
  AdjustMaterialDto,
  WriteOffMaterialDto,
} from './dto/create-material.dto'

const MATERIAL_INCLUDE = {
  stock: true,
}

@Injectable()
export class RawMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateMaterialDto) {
    return this.prisma.rawMaterial.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        category: dto.category as never,
        unit: dto.unit as never,
        costPerUnit: new Prisma.Decimal(dto.costPerUnit),
        supplier: dto.supplier,
        minStockLevel: new Prisma.Decimal(dto.minStockLevel),
      },
      include: MATERIAL_INCLUDE,
    })
  }

  async findAll({
    page = 1,
    limit = 50,
    search,
    category,
    lowStock,
  }: {
    page?: number
    limit?: number
    search?: string
    category?: string
    lowStock?: boolean
  }) {
    const where: Prisma.RawMaterialWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category as never

    const [items, total] = await Promise.all([
      this.prisma.rawMaterial.findMany({
        where,
        include: MATERIAL_INCLUDE,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.rawMaterial.count({ where }),
    ])

    const enriched = items.map((m) => ({
      ...m,
      quantity: m.stock ? Number(m.stock.quantity) : 0,
      isLowStock: m.stock
        ? Number(m.stock.quantity) < Number(m.minStockLevel)
        : Number(m.minStockLevel) > 0,
    }))

    const filtered = lowStock ? enriched.filter((m) => m.isLowStock) : enriched

    return { items: filtered, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const m = await this.prisma.rawMaterial.findUnique({ where: { id }, include: MATERIAL_INCLUDE })
    if (!m) throw new NotFoundException('Material not found')
    return {
      ...m,
      quantity: m.stock ? Number(m.stock.quantity) : 0,
      isLowStock: m.stock
        ? Number(m.stock.quantity) < Number(m.minStockLevel)
        : Number(m.minStockLevel) > 0,
    }
  }

  async update(id: string, dto: UpdateMaterialDto) {
    await this.findOne(id)
    return this.prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category as never }),
        ...(dto.unit && { unit: dto.unit as never }),
        ...(dto.costPerUnit !== undefined && { costPerUnit: new Prisma.Decimal(dto.costPerUnit) }),
        ...(dto.supplier !== undefined && { supplier: dto.supplier }),
        ...(dto.minStockLevel !== undefined && { minStockLevel: new Prisma.Decimal(dto.minStockLevel) }),
      },
      include: MATERIAL_INCLUDE,
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.rawMaterial.delete({ where: { id } })
  }

  // ── Stock operations ─────────────────────────────────────────────────────────

  async receive(id: string, dto: ReceiveMaterialDto, actorId: string) {
    const material = await this.findOne(id)
    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.rawMaterialStock.upsert({
        where: { materialId: id },
        create: { materialId: id, quantity: new Prisma.Decimal(dto.quantity) },
        update: { quantity: { increment: new Prisma.Decimal(dto.quantity) } },
      })
      const after = await tx.rawMaterialStock.findUniqueOrThrow({ where: { materialId: id } })
      // Update costPerUnit on the material
      await tx.rawMaterial.update({
        where: { id },
        data: { costPerUnit: new Prisma.Decimal(dto.costPerUnit) },
      })
      await tx.rawMaterialMovement.create({
        data: {
          materialId: id,
          type: 'RECEIVE',
          quantityDelta: new Prisma.Decimal(dto.quantity),
          quantityAfter: after.quantity,
          costPerUnit: new Prisma.Decimal(dto.costPerUnit),
          reference: dto.reference,
          actorId,
        },
      })
      return { ...material, quantity: Number(after.quantity) }
    })
  }

  async adjust(id: string, dto: AdjustMaterialDto, actorId: string) {
    const material = await this.findOne(id)
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.rawMaterialStock.upsert({
        where: { materialId: id },
        create: { materialId: id, quantity: 0 },
        update: {},
      })
      const newQty = Math.max(0, Number(current.quantity) + dto.delta)
      const after = await tx.rawMaterialStock.update({
        where: { materialId: id },
        data: { quantity: new Prisma.Decimal(newQty) },
      })
      await tx.rawMaterialMovement.create({
        data: {
          materialId: id,
          type: 'ADJUST',
          quantityDelta: new Prisma.Decimal(dto.delta),
          quantityAfter: after.quantity,
          reason: dto.reason,
          actorId,
        },
      })
      return { ...material, quantity: Number(after.quantity) }
    })
  }

  async writeOff(id: string, dto: WriteOffMaterialDto, actorId: string) {
    const material = await this.findOne(id)
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.rawMaterialStock.upsert({
        where: { materialId: id },
        create: { materialId: id, quantity: 0 },
        update: {},
      })
      if (Number(current.quantity) < dto.quantity) {
        throw new BadRequestException(
          `Cannot write off ${dto.quantity} — only ${Number(current.quantity)} in stock`,
        )
      }
      const after = await tx.rawMaterialStock.update({
        where: { materialId: id },
        data: { quantity: { decrement: new Prisma.Decimal(dto.quantity) } },
      })
      await tx.rawMaterialMovement.create({
        data: {
          materialId: id,
          type: 'WRITE_OFF',
          quantityDelta: new Prisma.Decimal(-dto.quantity),
          quantityAfter: after.quantity,
          reason: dto.reason,
          actorId,
        },
      })
      return { ...material, quantity: Number(after.quantity) }
    })
  }

  async getMovements(id: string, page = 1, limit = 30) {
    const [items, total] = await Promise.all([
      this.prisma.rawMaterialMovement.findMany({
        where: { materialId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.rawMaterialMovement.count({ where: { materialId: id } }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }
}
