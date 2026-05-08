import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

const VARIANT_INCLUDE = {
  variant: {
    include: {
      baseShoe: { select: { id: true, name: true, slug: true } },
    },
  },
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // ── Core helpers ────────────────────────────────────────────────────────────

  async getOrCreate(variantId: string) {
    return this.prisma.stockLevel.upsert({
      where: { variantId },
      create: { variantId, quantity: 0, reserved: 0 },
      update: {},
      include: VARIANT_INCLUDE,
    })
  }

  private async writeMovement(
    tx: PrismaService,
    stockLevelId: string,
    variantId: string,
    type: string,
    quantityDelta: number,
    reservedDelta: number,
    quantityAfter: number,
    reservedAfter: number,
    opts?: { reason?: string; reference?: string; actorId?: string },
  ) {
    return tx.stockMovement.create({
      data: {
        stockLevelId,
        variantId,
        type: type as never,
        quantityDelta,
        reservedDelta,
        quantityAfter,
        reservedAfter,
        reason: opts?.reason,
        reference: opts?.reference,
        actorId: opts?.actorId,
      },
    })
  }

  // ── Stock operations ─────────────────────────────────────────────────────────

  async receive(variantId: string, qty: number, opts?: { reference?: string; actorId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.upsert({
        where: { variantId },
        create: { variantId, quantity: qty, reserved: 0 },
        update: { quantity: { increment: qty } },
      })
      const after = await tx.stockLevel.findUniqueOrThrow({ where: { variantId } })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'RECEIVED',
        qty, 0, after.quantity, after.reserved, opts,
      )
      return after
    })
  }

  async reserve(variantId: string, qty: number, reference: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.upsert({
        where: { variantId },
        create: { variantId, quantity: 0, reserved: 0 },
        update: {},
      })
      const available = sl.quantity - sl.reserved
      if (available < qty) {
        throw new BadRequestException(
          `Insufficient stock for variant ${variantId}: ${available} available, ${qty} requested`,
        )
      }
      const after = await tx.stockLevel.update({
        where: { variantId },
        data: { reserved: { increment: qty } },
      })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'RESERVED',
        0, qty, after.quantity, after.reserved, { reference, actorId },
      )
      return after
    })
  }

  async release(variantId: string, qty: number, reference: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.findUnique({ where: { variantId } })
      if (!sl) return
      const newReserved = Math.max(0, sl.reserved - qty)
      const after = await tx.stockLevel.update({
        where: { variantId },
        data: { reserved: newReserved },
      })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'RELEASED',
        0, -qty, after.quantity, after.reserved, { reference, actorId },
      )
      return after
    })
  }

  async adjust(variantId: string, delta: number, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.upsert({
        where: { variantId },
        create: { variantId, quantity: Math.max(0, delta), reserved: 0 },
        update: {},
      })
      const newQty = Math.max(0, sl.quantity + delta)
      const after = await tx.stockLevel.update({
        where: { variantId },
        data: { quantity: newQty },
      })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'ADJUSTMENT',
        delta, 0, after.quantity, after.reserved, { reason, actorId },
      )
      return after
    })
  }

  async writeOff(variantId: string, qty: number, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.upsert({
        where: { variantId },
        create: { variantId, quantity: 0, reserved: 0 },
        update: {},
      })
      if (sl.quantity < qty) {
        throw new BadRequestException(`Cannot write off ${qty} — only ${sl.quantity} in stock`)
      }
      const after = await tx.stockLevel.update({
        where: { variantId },
        data: { quantity: { decrement: qty } },
      })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'WRITE_OFF',
        -qty, 0, after.quantity, after.reserved, { reason, actorId },
      )
      return after
    })
  }

  async stocktake(variantId: string, physicalCount: number, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sl = await tx.stockLevel.upsert({
        where: { variantId },
        create: { variantId, quantity: physicalCount, reserved: 0 },
        update: {},
      })
      const delta = physicalCount - sl.quantity
      const after = await tx.stockLevel.update({
        where: { variantId },
        data: { quantity: physicalCount },
      })
      await this.writeMovement(
        tx as unknown as PrismaService, sl.id, variantId, 'STOCKTAKE',
        delta, 0, after.quantity, after.reserved,
        { reason: `Physical count: ${physicalCount}`, actorId },
      )
      return after
    })
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async findAll({
    page = 1,
    limit = 50,
    search,
    lowStock,
  }: {
    page?: number
    limit?: number
    search?: string
    lowStock?: boolean
  }) {
    const threshold = await this.settings.getLowStockThreshold()
    const where: Record<string, unknown> = {}
    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { baseShoe: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: {
          variant: {
            include: {
              baseShoe: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockLevel.count({ where }),
    ])

    const enriched = items
      .map((sl) => ({ ...sl, available: sl.quantity - sl.reserved, threshold }))
      .filter((sl) => !lowStock || sl.available < threshold)

    return { items: enriched, total, page, limit, pages: Math.ceil(total / limit), threshold }
  }

  async findOne(variantId: string) {
    const threshold = await this.settings.getLowStockThreshold()
    const sl = await this.getOrCreate(variantId)
    return { ...sl, available: sl.quantity - sl.reserved, threshold }
  }

  async getMovements(variantId: string, page = 1, limit = 30) {
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { variantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where: { variantId } }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async getStocktakeList() {
    const threshold = await this.settings.getLowStockThreshold()
    const variants = await this.prisma.productVariant.findMany({
      include: {
        baseShoe: { select: { id: true, name: true } },
        stockLevel: true,
      },
      orderBy: [{ baseShoe: { name: 'asc' } }, { size: 'asc' }],
    })
    return variants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      shoeName: v.baseShoe.name,
      quantity: v.stockLevel?.quantity ?? 0,
      reserved: v.stockLevel?.reserved ?? 0,
      available: (v.stockLevel?.quantity ?? 0) - (v.stockLevel?.reserved ?? 0),
      threshold,
    }))
  }
}
