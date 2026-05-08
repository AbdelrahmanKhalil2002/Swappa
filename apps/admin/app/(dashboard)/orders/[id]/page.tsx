'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { get, patch } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'

interface OrderItem {
  id: string
  snapshotName: string
  snapshotSku: string
  quantity: number
  unitPrice: string
  heelPrice: string
  lineTotal: string
  heelStyle: { id: string; name: string } | null
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
  updatedAt: string
  status: string
  paymentStatus: string
  stripePaymentIntentId: string | null
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

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

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
  REFUNDED: 'text-muted-foreground',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    get<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!order || order.status === newStatus) return
    setUpdating(true); setError('')
    try {
      const updated = await patch<Order>(`/orders/${id}/status`, { status: newStatus })
      setOrder(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/orders" className="text-sm underline mt-2 inline-block">Back to orders</Link>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[order.status] ?? 'bg-muted text-foreground'
  const paymentColor = PAYMENT_COLORS[order.paymentStatus] ?? ''

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/orders" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          All orders
        </Link>
      </div>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="border rounded-xl overflow-hidden bg-surface">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h2 className="text-sm font-semibold">Items ({order.items.length})</h2>
            </div>
            <div className="divide-y">
              {order.items.map((item) => {
                const img = item.variant.baseShoe.media[0]?.url
                return (
                  <div key={item.id} className="flex gap-4 p-4">
                    <div className="relative w-14 h-14 bg-muted rounded-lg overflow-hidden shrink-0">
                      {img && <Image src={img} alt={item.snapshotName} fill className="object-cover" sizes="56px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.snapshotName}</p>
                      <p className="text-xs text-muted-foreground">
                        Size {item.variant.size} · {item.variant.color}
                        {item.heelStyle ? ` · + ${item.heelStyle.name}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{item.snapshotSku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">EGP {Number(item.lineTotal).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="border rounded-xl p-5 bg-surface space-y-2 text-sm">
            <h2 className="font-semibold mb-3">Totals</h2>
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
        </div>

        {/* Right: status + customer */}
        <div className="space-y-4">
          {/* Status control */}
          <div className="border rounded-xl p-5 bg-surface space-y-3">
            <h2 className="text-sm font-semibold">Order status</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
              </span>
              <span className={`text-xs font-medium ${paymentColor}`}>
                · {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="space-y-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updating || order.status === s}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    order.status === s
                      ? 'bg-foreground text-background font-medium'
                      : 'border hover:bg-muted disabled:opacity-40'
                  }`}
                >
                  {updating && order.status !== s ? (
                    <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                  ) : (
                    s.charAt(0) + s.slice(1).toLowerCase()
                  )}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {order.stripePaymentIntentId && (
              <p className="text-xs text-muted-foreground font-mono break-all">{order.stripePaymentIntentId}</p>
            )}
          </div>

          {/* Customer */}
          <div className="border rounded-xl p-5 bg-surface text-sm space-y-1">
            <h2 className="font-semibold mb-2">Customer</h2>
            <p>{order.firstName} {order.lastName}</p>
            <p className="text-muted-foreground">{order.email}</p>
            <p className="text-muted-foreground">{order.phone}</p>
            <div className="pt-2 border-t mt-2 space-y-0.5">
              <p className="text-muted-foreground">{order.addressLine1}</p>
              {order.addressLine2 && <p className="text-muted-foreground">{order.addressLine2}</p>}
              <p className="text-muted-foreground">{order.city}, {order.governorate}</p>
            </div>
            {order.notes && (
              <p className="pt-2 border-t mt-2 text-muted-foreground italic text-xs">&ldquo;{order.notes}&rdquo;</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
