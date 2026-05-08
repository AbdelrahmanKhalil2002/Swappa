'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { get } from '../../../../lib/api-client'
import { useAuth } from '../../../../context/auth-context'

interface OrderItem {
  id: string
  snapshotName: string
  snapshotSku: string
  quantity: number
  unitPrice: string
  heelPrice: string
  lineTotal: string
  heelStyle: { name: string } | null
  variant: {
    size: string
    color: string
    baseShoe: {
      name: string
      slug: string
      media: { url: string; alt: string | null }[]
    }
  }
}

interface Order {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: string
  email: string
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  governorate: string
  shippingMethod: string
  notes: string | null
  subtotal: string
  shippingCost: string
  discountAmount: string
  total: string
  items: OrderItem[]
  coupon: { code: string; type: string; value: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-purple-50 text-purple-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600',
  PAID: 'text-emerald-600',
  FAILED: 'text-red-500',
  REFUNDED: 'text-gray-500',
}

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    get<Order>(`/orders/mine/${id}`)
      .then(setOrder)
      .catch(() => router.replace('/account/orders'))
      .finally(() => setLoading(false))
  }, [id, user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) return null

  const statusColor = STATUS_COLORS[order.status] ?? 'bg-muted text-foreground'
  const paymentColor = PAYMENT_COLORS[order.paymentStatus] ?? 'text-foreground'

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/account/orders" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          My orders
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light">{order.orderNumber}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Placed {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right space-y-1">
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
              {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
            </span>
            <p className={`text-xs font-medium ${paymentColor}`}>
              {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Items */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b">
              <h2 className="text-sm font-semibold">Items</h2>
            </div>
            <div className="divide-y">
              {order.items.map((item) => {
                const img = item.variant.baseShoe.media[0]?.url
                return (
                  <div key={item.id} className="flex gap-4 p-4">
                    <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                      {img && <Image src={img} alt={item.variant.baseShoe.name} fill className="object-cover" sizes="64px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{item.snapshotName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Size {item.variant.size} · {item.variant.color}
                      </p>
                      {item.heelStyle && (
                        <p className="text-xs text-muted-foreground">+ {item.heelStyle.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium shrink-0">EGP {Number(item.lineTotal).toLocaleString()}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="border rounded-xl p-5 space-y-2 text-sm">
            <h2 className="font-semibold mb-3">Order summary</h2>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>EGP {Number(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping ({order.shippingMethod})</span>
              <span>{Number(order.shippingCost) === 0 ? 'Free' : `EGP ${Number(order.shippingCost)}`}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount{order.coupon ? ` (${order.coupon.code})` : ''}</span>
                <span>−EGP {Number(order.discountAmount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span><span>EGP {Number(order.total).toLocaleString()}</span>
            </div>
          </div>

          {/* Delivery */}
          <div className="border rounded-xl p-5 text-sm space-y-1">
            <h2 className="font-semibold mb-3">Delivery details</h2>
            <p>{order.firstName} {order.lastName}</p>
            <p className="text-muted-foreground">{order.phone}</p>
            <p className="text-muted-foreground">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</p>
            <p className="text-muted-foreground">{order.city}, {order.governorate}</p>
            {order.notes && <p className="text-muted-foreground mt-2 italic">&ldquo;{order.notes}&rdquo;</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
