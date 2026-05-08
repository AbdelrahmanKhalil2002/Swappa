'use client'

import { useCart } from '../../context/cart-context'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { post } from '../../lib/api-client'

interface CouponResult { valid: boolean; discount?: number; message?: string }

export default function CartPage() {
  const { items, count, subtotal, removeItem, updateQty, clearCart } = useCart()
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [validating, setValidating] = useState(false)

  const shippingCost = subtotal >= 500 ? 0 : 50
  const discountAmount = coupon?.discount ?? 0
  const total = Math.max(0, subtotal + shippingCost - discountAmount)

  async function handleCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!couponCode.trim()) return
    setValidating(true); setCouponError('')
    try {
      const res = await post<{ discount: number }>('/checkout/coupon/validate', {
        code: couponCode.trim().toUpperCase(),
        subtotal,
      })
      setCoupon({ code: couponCode.trim().toUpperCase(), discount: res.discount })
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon')
    } finally { setValidating(false) }
  }

  if (count === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
        <h1 className="font-display text-2xl font-light">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Add some shoes to get started.</p>
        <Link href="/shop" className="mt-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
          Browse shoes
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-light mb-8">Your cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const img = item.variant.baseShoe.media[0]?.url
              const basePrice = Number(item.variant.baseShoe.basePrice)
              const heelPrice = Number(item.heel?.addedPrice ?? 0)
              const linePrice = (basePrice + heelPrice) * item.quantity
              return (
                <div key={item.key} className="flex gap-4 p-4 border rounded-xl">
                  <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                    {img && <Image src={img} alt={item.variant.baseShoe.name} fill className="object-cover" sizes="80px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{item.variant.baseShoe.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Size {item.variant.size} · {item.variant.color}
                    </p>
                    {item.heel && (
                      <p className="text-xs text-muted-foreground">+ {item.heel.name}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 border rounded-lg">
                        <button onClick={() => updateQty(item.key, item.quantity - 1)}
                          className="p-1.5 hover:bg-muted transition-colors rounded-l-lg">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.key, item.quantity + 1)}
                          className="p-1.5 hover:bg-muted transition-colors rounded-r-lg">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium">EGP {linePrice.toLocaleString()}</p>
                        <button onClick={() => removeItem(item.key)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-xl p-5 space-y-4 sticky top-6">
              <h2 className="font-semibold text-sm">Order summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>EGP {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping {subtotal >= 500 ? <span className="text-emerald-600">(free)</span> : ''}
                  </span>
                  <span>{shippingCost === 0 ? 'Free' : `EGP ${shippingCost}`}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({coupon?.code})</span>
                    <span>−EGP {discountAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>EGP {total.toLocaleString()}</span>
              </div>

              {/* Coupon */}
              {!coupon && (
                <form onSubmit={handleCoupon} className="flex gap-2">
                  <input
                    value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 uppercase"
                  />
                  <button type="submit" disabled={validating}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
                    Apply
                  </button>
                </form>
              )}
              {coupon && (
                <div className="flex items-center justify-between text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <span>✓ {coupon.code}</span>
                  <button onClick={() => setCoupon(null)} className="text-xs underline">Remove</button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-500">{couponError}</p>}

              <Link
                href={`/checkout${coupon ? `?coupon=${coupon.code}` : ''}`}
                className="block w-full text-center py-3 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors"
              >
                Checkout
              </Link>

              <Link href="/shop" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
