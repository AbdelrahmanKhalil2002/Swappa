'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, Loader2 } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { useAuth } from '../../../context/auth-context'

interface OrderItem {
  id: string
  snapshotName: string
  quantity: number
  unitPrice: string
  heelPrice: string
  lineTotal: string
  heelStyle: { name: string } | null
}

interface Order {
  id: string
  orderNumber: string
  email: string
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  governorate: string
  shippingMethod: string
  subtotal: string
  shippingCost: string
  discountAmount: string
  total: string
  status: string
  paymentStatus: string
  items: OrderItem[]
  coupon: { code: string } | null
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')
  const { user } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!orderId || !user) return
    setLoading(true)
    get<Order>(`/orders/mine/${orderId}`)
      .then(setOrder)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [orderId, user])

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-16 px-4">
      <div className="max-w-lg w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="font-display text-3xl font-light">Order confirmed</h1>
          <p className="text-muted-foreground text-sm">
            Thank you for your order. We&apos;ll send a confirmation to your email shortly.
          </p>
          {orderNumber && (
            <p className="text-sm font-medium">Order #{orderNumber}</p>
          )}
        </div>

        {/* Order details (only if logged in and loaded) */}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {order && (
          <div className="border rounded-xl divide-y">
            {/* Items */}
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold">Items</h2>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.snapshotName}
                    {item.heelStyle ? ` + ${item.heelStyle.name}` : ''}
                    {' '}× {item.quantity}
                  </span>
                  <span>EGP {Number(item.lineTotal).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="p-5 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>EGP {Number(order.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{Number(order.shippingCost) === 0 ? 'Free' : `EGP ${Number(order.shippingCost)}`}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount{order.coupon ? ` (${order.coupon.code})` : ''}</span>
                  <span>−EGP {Number(order.discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Total</span><span>EGP {Number(order.total).toLocaleString()}</span>
              </div>
            </div>

            {/* Delivery */}
            <div className="p-5 text-sm space-y-1">
              <h2 className="font-semibold mb-2">Delivery to</h2>
              <p>{order.firstName} {order.lastName}</p>
              <p className="text-muted-foreground">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</p>
              <p className="text-muted-foreground">{order.city}, {order.governorate}</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          {user && (
            <Link
              href="/account/orders"
              className="flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Package className="w-4 h-4" />
              View my orders
            </Link>
          )}
          <Link
            href="/shop"
            className="flex-1 py-3 text-center bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
