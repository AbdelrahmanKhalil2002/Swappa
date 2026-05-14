import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { InventoryService } from '../inventory/inventory.service'
import { CreateReturnDto } from './dto/create-return.dto'
import { InspectReturnDto } from './dto/inspect-return.dto'
import { ProcessRefundDto } from './dto/process-refund.dto'
import { ReturnItemCondition, ReturnStatus, ReturnType } from '@prisma/client'

const WARRANTY_DAYS = 30

const RETURN_INCLUDE = {
  order: {
    select: {
      orderNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      stripePaymentIntentId: true,
      total: true,
      createdAt: true,
      items: {
        include: {
          variant: { select: { size: true, color: true, baseShoe: { select: { name: true } } } },
          heelStyle: { select: { name: true } },
        },
      },
    },
  },
  items: {
    include: {
      orderItem: {
        include: {
          variant: { select: { id: true, size: true, color: true, baseShoe: { select: { name: true } } } },
          heelStyle: { select: { name: true } },
        },
      },
    },
  },
  inspection: { include: { inspectedBy: { select: { firstName: true, lastName: true } } } },
  refund: { include: { processedBy: { select: { firstName: true, lastName: true } } } },
  createdBy: { select: { firstName: true, lastName: true } },
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  private generateReturnNumber() {
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    return `RET-${ts}-${rand}`
  }

  private generateStoreCreditCode() {
    return `SC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  }

  async create(dto: CreateReturnDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    const warrantyDeadline = new Date(order.createdAt)
    warrantyDeadline.setDate(warrantyDeadline.getDate() + WARRANTY_DAYS)
    const isInWarranty = new Date() <= warrantyDeadline

    const orderItemIds = order.items.map((i) => i.id)
    for (const item of dto.items) {
      if (!orderItemIds.includes(item.orderItemId)) {
        throw new BadRequestException(`Order item ${item.orderItemId} does not belong to this order`)
      }
    }

    return this.prisma.return.create({
      data: {
        returnNumber: this.generateReturnNumber(),
        orderId: dto.orderId,
        type: dto.type,
        reason: dto.reason,
        reasonNotes: dto.reasonNotes,
        isInWarranty,
        createdById: adminId,
        items: {
          create: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: RETURN_INCLUDE,
    })
  }

  async findAll(filter: { status?: string; type?: string; page?: number; limit?: number }) {
    const { status, type, page = 1, limit = 30 } = filter
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    const [items, total] = await Promise.all([
      this.prisma.return.findMany({
        where,
        include: {
          order: { select: { orderNumber: true, firstName: true, lastName: true } },
          items: { select: { id: true } },
          refund: { select: { method: true, amount: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.return.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const ret = await this.prisma.return.findUnique({ where: { id }, include: RETURN_INCLUDE })
    if (!ret) throw new NotFoundException('Return not found')
    return ret
  }

  async markReceived(id: string) {
    const ret = await this.prisma.return.findUnique({ where: { id } })
    if (!ret) throw new NotFoundException('Return not found')
    if (ret.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Return must be in REQUESTED status to mark as received')
    }
    return this.prisma.return.update({
      where: { id },
      data: { status: ReturnStatus.RECEIVED },
      include: RETURN_INCLUDE,
    })
  }

  async inspect(id: string, dto: InspectReturnDto, adminId: string) {
    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: { items: { include: { orderItem: true } }, inspection: true },
    })
    if (!ret) throw new NotFoundException('Return not found')
    if (ret.status !== ReturnStatus.RECEIVED) {
      throw new BadRequestException('Return must be RECEIVED before inspection')
    }
    if (ret.inspection) throw new ConflictException('Return already inspected')

    await this.prisma.$transaction(async (tx) => {
      await tx.returnInspection.create({
        data: {
          returnId: id,
          inspectedById: adminId,
          notes: dto.notes,
        },
      })

      for (const itemDto of dto.items) {
        const returnItem = ret.items.find((i) => i.id === itemDto.returnItemId)
        if (!returnItem) continue
        await tx.returnItem.update({
          where: { id: itemDto.returnItemId },
          data: { condition: itemDto.condition, notes: itemDto.notes },
        })

        if (itemDto.condition === ReturnItemCondition.RESALABLE) {
          await this.inventory.receive(returnItem.orderItem.variantId, returnItem.quantity)
        }
      }

      await tx.return.update({ where: { id }, data: { status: ReturnStatus.INSPECTED } })
    })

    return this.findOne(id)
  }

  async processRefund(id: string, dto: ProcessRefundDto, adminId: string) {
    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: { refund: true, order: { select: { stripePaymentIntentId: true } } },
    })
    if (!ret) throw new NotFoundException('Return not found')
    if (ret.status !== ReturnStatus.INSPECTED) {
      throw new BadRequestException('Return must be INSPECTED before processing refund')
    }
    if (ret.refund) throw new ConflictException('Refund already processed')

    let stripeRefundId: string | undefined
    let storeCreditCode: string | undefined

    if (dto.method === 'STRIPE') {
      if (!ret.order.stripePaymentIntentId) {
        throw new BadRequestException('No Stripe payment intent on this order')
      }
      // Stub: in production call Stripe SDK here
      stripeRefundId = `re_stub_${Date.now()}`
    } else {
      storeCreditCode = this.generateStoreCreditCode()
    }

    await this.prisma.$transaction([
      this.prisma.refund.create({
        data: {
          returnId: id,
          method: dto.method,
          amount: dto.amount,
          stripeRefundId,
          storeCreditCode,
          processedById: adminId,
        },
      }),
      this.prisma.return.update({
        where: { id },
        data: { status: ReturnStatus.RESOLVED },
      }),
      ...(dto.method === 'STRIPE'
        ? [this.prisma.order.update({
            where: { id: ret.orderId },
            data: { paymentStatus: 'REFUNDED' },
          })]
        : []),
    ])

    return this.findOne(id)
  }

  async dispatchExchange(id: string, adminId: string) {
    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        items: { include: { orderItem: true } },
      },
    })
    if (!ret) throw new NotFoundException('Return not found')
    if (ret.status !== ReturnStatus.INSPECTED) {
      throw new BadRequestException('Return must be INSPECTED before dispatch')
    }
    if (ret.type !== ReturnType.SIZE_EXCHANGE && ret.type !== ReturnType.HEEL_STYLE_EXCHANGE) {
      throw new BadRequestException('Only SIZE_EXCHANGE or HEEL_STYLE_EXCHANGE can create replacement orders')
    }
    if (ret.replacementOrderId) throw new ConflictException('Replacement order already created')

    const orig = ret.order
    const ts = Date.now().toString(36).toUpperCase()
    const replacementNumber = `${orig.orderNumber}-REP-${ts}`

    const replacement = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: replacementNumber,
          customerId: orig.customerId ?? undefined,
          email: orig.email,
          firstName: orig.firstName,
          lastName: orig.lastName,
          phone: orig.phone,
          addressLine1: orig.addressLine1,
          addressLine2: orig.addressLine2 ?? undefined,
          city: orig.city,
          governorate: orig.governorate,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          subtotal: orig.total,
          total: orig.total,
          shippingMethod: orig.shippingMethod,
          isReplacement: true,
          replacementForOrderId: orig.id,
          items: {
            create: orig.items.map((item) => ({
              variantId: item.variantId,
              heelStyleId: item.heelStyleId ?? undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              heelPrice: item.heelPrice,
              lineTotal: item.lineTotal,
              snapshotName: item.snapshotName,
              snapshotSku: item.snapshotSku,
            })),
          },
        },
      })

      await tx.return.update({
        where: { id },
        data: { status: ReturnStatus.RESOLVED, replacementOrderId: newOrder.id },
      })

      return newOrder
    })

    return { replacement, return: await this.findOne(id) }
  }

  async findMine(customerId: string) {
    return this.prisma.return.findMany({
      where: { order: { customerId } },
      include: {
        order: { select: { orderNumber: true } },
        items: { select: { id: true, quantity: true, orderItem: { select: { snapshotName: true } } } },
        refund: { select: { method: true, amount: true, storeCreditCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getAnalytics() {
    const [byReason, byType, byStatus, recentReturns] = await Promise.all([
      this.prisma.return.groupBy({ by: ['reason'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.return.groupBy({ by: ['type'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.return.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.return.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ])
    return { byReason, byType, byStatus, recentReturns }
  }
}
