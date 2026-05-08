'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight, Loader2 } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { useAuth } from '../../../context/auth-context'

interface OrderSummary {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: string
  total: string
  items: { id: string; snapshotName: string; quantity: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-purple-50 text-purple-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    get<OrderSummary[]>('/orders/mine')
      .then(setOrders)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl font-light mb-8">My orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="inline-block mt-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
              Shop now
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const preview = order.items.slice(0, 2).map((i) => `${i.snapshotName} ×${i.quantity}`).join(', ')
              const extra = order.items.length > 2 ? ` +${order.items.length - 2} more` : ''
              const color = STATUS_COLORS[order.status] ?? 'bg-muted text-foreground'
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{preview}{extra}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">EGP {Number(order.total).toLocaleString()}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
