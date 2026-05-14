import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Carrier, ShipmentStatus } from '@prisma/client'
import { CreateShipmentDto } from './dto/create-shipment.dto'
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto'

const STUB_RATES = (carrier: Carrier) => ({
  DHL: { carrier: 'DHL', service: 'Express Worldwide', estimatedDays: 2, cost: 180 },
  ARAMEX: { carrier: 'ARAMEX', service: 'Priority', estimatedDays: 3, cost: 140 },
  BOSTA: { carrier: 'BOSTA', service: 'Next Day', estimatedDays: 1, cost: 75 },
  SMSA: { carrier: 'SMSA', service: 'Standard', estimatedDays: 4, cost: 60 },
  MANUAL: { carrier: 'MANUAL', service: 'Manual Delivery', estimatedDays: 7, cost: 0 },
}[carrier])

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async getCarrierRates(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
    if (!order) throw new NotFoundException('Order not found')
    return Object.values(Carrier).map((c) => STUB_RATES(c))
  }

  async createShipment(orderId: string, dto: CreateShipmentDto, adminId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
    if (!order) throw new NotFoundException('Order not found')
    return this.prisma.shipment.create({
      data: {
        orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        shippingCost: dto.shippingCost,
        estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : undefined,
        createdById: adminId,
        status: 'LABEL_CREATED',
      },
      include: { events: true },
    })
  }

  async findByOrder(orderId: string) {
    return this.prisma.shipment.findMany({
      where: { orderId },
      include: { events: { orderBy: { occurredAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findAll(filter: { status?: string; carrier?: string; page?: number; limit?: number }) {
    const { status, carrier, page = 1, limit = 30 } = filter
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (carrier) where.carrier = carrier
    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: {
          order: { select: { orderNumber: true, firstName: true, lastName: true } },
          events: { orderBy: { occurredAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true, firstName: true, lastName: true, email: true } },
        events: { orderBy: { occurredAt: 'desc' } },
      },
    })
    if (!shipment) throw new NotFoundException('Shipment not found')
    return shipment
  }

  async updateStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } })
    if (!shipment) throw new NotFoundException('Shipment not found')

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date()

    const [updated] = await this.prisma.$transaction([
      this.prisma.shipment.update({
        where: { id },
        data: { status: dto.status },
        include: { events: { orderBy: { occurredAt: 'desc' } } },
      }),
      this.prisma.shipmentEvent.create({
        data: {
          shipmentId: id,
          status: dto.status,
          description: dto.description ?? dto.status.replace(/_/g, ' ').toLowerCase(),
          location: dto.location,
          occurredAt,
        },
      }),
    ])

    if (dto.status === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      })
    }

    return updated
  }

  async handleCarrierWebhook(carrier: string, payload: unknown) {
    return { received: true, carrier, payload }
  }
}
