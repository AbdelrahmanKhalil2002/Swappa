import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: { include: { baseShoe: { select: { name: true, slug: true, media: { where: { type: 'GALLERY' as const }, take: 1, orderBy: { position: 'asc' as const } } } } } },
      heelStyle: { select: { id: true, name: true, slug: true } },
    },
  },
  coupon: { select: { code: true, type: true, value: true } },
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Customer ────────────────────────────────────────────────────────────────

  findMine(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: { select: { id: true, snapshotName: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findMineById(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: ORDER_INCLUDE,
    })
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async findAll({ page = 1, limit = 30, status, search }: { page?: number; limit?: number; status?: string; search?: string }) {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ]
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { id: true, quantity: true, snapshotName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE })
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  updateStatus(id: string, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: status as never },
      include: ORDER_INCLUDE,
    })
  }
}
