import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { CheckoutService } from './checkout.service'
import { CreateIntentDto } from './dto/create-intent.dto'
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard'

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get('shipping-rates')
  shippingRates() {
    return this.checkout.getShippingRates()
  }

  @Post('coupon/validate')
  async validateCoupon(@Body() body: { code: string; subtotal: number }) {
    const coupon = await this.checkout.validateCoupon(body.code, body.subtotal)
    const shippingCost = body.subtotal >= 500 ? 0 : 50
    const discount = this.checkout.calculateDiscount(coupon, body.subtotal, shippingCost)
    return { valid: true, discount }
  }

  @Post('intent')
  createIntent(@Body() dto: CreateIntentDto, @Req() req: { user?: { id: string } }) {
    return this.checkout.createIntent(dto, req.user?.id)
  }
}
