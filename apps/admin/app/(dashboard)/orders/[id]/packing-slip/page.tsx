'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { get } from '../../../../../lib/api-client'

interface OrderItem {
  id: string
  snapshotName: string
  snapshotSku: string
  quantity: number
  unitPrice: string
  heelPrice: string
  lineTotal: string
  heelStyle: { name: string } | null
  variant: { size: string; color: string }
}

interface Order {
  id: string
  orderNumber: string
  createdAt: string
  firstName: string
  lastName: string
  phone: string
  email: string
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
  coupon: { code: string } | null
}

export default function PackingSlipPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (order) {
      setTimeout(() => window.print(), 300)
    }
  }, [order])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) return <p className="p-8 text-muted-foreground">Order not found.</p>

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="bg-white min-h-screen p-10 font-sans text-sm" style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Swappa</h1>
          <p className="text-muted-foreground text-xs mt-1">Packing Slip</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Printed: {today}</p>
          <p className="font-mono font-semibold text-base text-foreground mt-1">{order.orderNumber}</p>
        </div>
      </div>

      {/* Ship to */}
      <div className="mb-8 border rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ship to</h2>
        <p className="font-semibold">{order.firstName} {order.lastName}</p>
        <p>{order.addressLine1}</p>
        {order.addressLine2 && <p>{order.addressLine2}</p>}
        <p>{order.city}, {order.governorate}</p>
        <p className="mt-1 text-muted-foreground">{order.phone}</p>
        <p className="text-muted-foreground">{order.email}</p>
      </div>

      {/* Items */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Items</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-semibold">Product</th>
              <th className="pb-2 font-semibold text-center">Size</th>
              <th className="pb-2 font-semibold text-center">Qty</th>
              <th className="pb-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5">
                  <p className="font-medium">{item.snapshotName}</p>
                  {item.heelStyle && <p className="text-xs text-muted-foreground">+ {item.heelStyle.name}</p>}
                  <p className="text-xs text-muted-foreground font-mono">{item.snapshotSku}</p>
                </td>
                <td className="py-2.5 text-center text-muted-foreground">{item.variant.size}</td>
                <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                <td className="py-2.5 text-right font-mono">EGP {Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-1.5 text-sm">
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
        <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
          <span>Total</span><span>EGP {Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      {order.notes && (
        <div className="mt-6 border rounded-xl p-4 bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Customer note</p>
          <p className="italic text-muted-foreground">{order.notes}</p>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Thank you for your order! Questions? hello@swappa.com
      </p>

      <style>{`@media print { @page { margin: 1cm; } button { display: none !important; } }`}</style>
    </div>
  )
}
