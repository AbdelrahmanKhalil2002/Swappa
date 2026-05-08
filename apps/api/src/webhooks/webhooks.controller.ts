import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'

@Controller('webhooks')
export class WebhooksController {
  private readonly stripe
  private readonly webhookSecret: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'))
    this.webhookSecret = config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET')
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripe(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any
    try {
      event = this.stripe.webhooks.constructEvent(req.body as Buffer, sig, this.webhookSecret)
    } catch {
      throw new BadRequestException('Invalid Stripe signature')
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const piId = event.data.object.id
        await this.prisma.order.updateMany({
          where: { stripePaymentIntentId: piId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        })
        const order = await this.prisma.order.findFirst({ where: { stripePaymentIntentId: piId } })
        if (order?.couponId) {
          await this.prisma.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } })
        }
        break
      }
      case 'payment_intent.payment_failed': {
        await this.prisma.order.updateMany({
          where: { stripePaymentIntentId: event.data.object.id },
          data: { paymentStatus: 'FAILED' },
        })
        break
      }
    }

    res.json({ received: true })
  }
}
