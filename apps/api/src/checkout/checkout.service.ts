import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateIntentDto } from './dto/create-intent.dto'

const SHIPPING_RATES = {
  standard: { label: 'Standard (3–5 days)', cost: 50, freeAbove: 500 },
  express: { label: 'Express (1–2 days)', cost: 120, freeAbove: null },
}

@Injectable()
export class CheckoutService {
  private readonly stripe

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'))
  }

  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or inactive coupon code')
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon has expired')
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached')
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order of EGP ${coupon.minOrderAmount} required for this coupon`)
    }
    return coupon
  }

  calculateDiscount(coupon: { type: string; value: Prisma.Decimal }, subtotal: number, shippingCost: number) {
    if (coupon.type === 'PERCENTAGE') return Math.min((subtotal * Number(coupon.value)) / 100, subtotal)
    if (coupon.type === 'FIXED') return Math.min(Number(coupon.value), subtotal)
    if (coupon.type === 'FREE_SHIPPING') return shippingCost
    return 0
  }

  async createIntent(dto: CreateIntentDto, customerId?: string) {
    // Resolve all variants + heel styles
    const variantIds = dto.items.map((i) => i.variantId)
    const heelIds = dto.items.map((i) => i.heelStyleId).filter(Boolean) as string[]

    const [variants, heels] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { baseShoe: { select: { name: true, basePrice: true } } },
      }),
      heelIds.length
        ? this.prisma.heelStyle.findMany({ where: { id: { in: heelIds }, status: 'ACTIVE' } })
        : Promise.resolve([]),
    ])

    // Validate all items exist and are orderable
    for (const item of dto.items) {
      const variant = variants.find((v) => v.id === item.variantId)
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`)
      if (item.heelStyleId) {
        const heel = heels.find((h) => h.id === item.heelStyleId)
        if (!heel) throw new NotFoundException(`Heel style ${item.heelStyleId} not found`)
        const compat = await this.prisma.heelCompatibility.findUnique({
          where: { baseShoeId_heelStyleId: { baseShoeId: variant.baseShoeId, heelStyleId: item.heelStyleId } },
        })
        if (!compat?.isCompatible) throw new BadRequestException('Incompatible base shoe and heel style combination')
      }
    }

    // Calculate subtotal
    let subtotal = 0
    const lineItems = dto.items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId)!
      const heel = item.heelStyleId ? heels.find((h) => h.id === item.heelStyleId) : null
      const unitPrice = Number(variant.baseShoe.basePrice)
      const heelPrice = heel ? Number(heel.addedPrice) : 0
      const lineTotal = (unitPrice + heelPrice) * item.quantity
      subtotal += lineTotal
      return { variant, heel, unitPrice, heelPrice, lineTotal, quantity: item.quantity }
    })

    // Shipping
    const rate = SHIPPING_RATES[dto.shippingMethod]
    const shippingCost = rate.freeAbove != null && subtotal >= rate.freeAbove ? 0 : rate.cost

    // Coupon
    let coupon = null
    let discountAmount = 0
    if (dto.couponCode) {
      coupon = await this.validateCoupon(dto.couponCode, subtotal)
      discountAmount = this.calculateDiscount(coupon, subtotal, shippingCost)
    }

    const total = Math.max(0, subtotal + shippingCost - discountAmount)
    const totalCents = Math.round(total * 100)

    // Generate order number: SW-YYYYMMDD-XXXX
    const today = new Date()
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const count = await this.prisma.order.count()
    const orderNumber = `SW-${datePart}-${String(count + 1).padStart(4, '0')}`

    // Create Stripe PaymentIntent
    const intent = await this.stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'egp',
      metadata: { orderNumber },
    })

    // Create pending order
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId: customerId ?? null,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        governorate: dto.governorate,
        shippingMethod: dto.shippingMethod,
        notes: dto.notes,
        subtotal: new Prisma.Decimal(subtotal),
        shippingCost: new Prisma.Decimal(shippingCost),
        discountAmount: new Prisma.Decimal(discountAmount),
        total: new Prisma.Decimal(total),
        couponId: coupon?.id ?? null,
        stripePaymentIntentId: intent.id,
        items: {
          create: lineItems.map(({ variant, heel, unitPrice, heelPrice, lineTotal, quantity }) => ({
            variantId: variant.id,
            heelStyleId: heel?.id ?? null,
            quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
            heelPrice: new Prisma.Decimal(heelPrice),
            lineTotal: new Prisma.Decimal(lineTotal),
            snapshotName: variant.baseShoe.name,
            snapshotSku: variant.sku,
          })),
        },
      },
    })

    return {
      clientSecret: intent.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
      subtotal,
      shippingCost,
      discountAmount,
      total,
    }
  }

  getShippingRates() {
    return Object.entries(SHIPPING_RATES).map(([key, r]) => ({
      id: key,
      label: r.label,
      cost: r.cost,
      freeAbove: r.freeAbove,
    }))
  }
}
