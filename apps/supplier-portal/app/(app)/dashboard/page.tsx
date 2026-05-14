'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import { get } from '../../../lib/api-client'

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

interface PO {
  id: string; orderNumber: string; status: POStatus
  expectedDeliveryDate: string | null; createdAt: string
  lines: { quantityOrdered: string; unitCost: string; material: { name: string } }[]
  goodsReceipts: { status: string }[]
}

const STATUS_STYLES: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-500', SENT: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700', PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-gray-100 text-gray-400',
}
const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', CONFIRMED: 'Confirmed',
  PARTIALLY_RECEIVED: 'Partially Received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
}

export default function PortalDashboard() {
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { const data = await get<PO[]>('/procurement/portal/orders'); setOrders(data) }
    catch { /* noop */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const active = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'RECEIVED')
  const completed = orders.filter((o) => o.status === 'RECEIVED')

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total · {active.length} active</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No purchase orders yet.</div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</h2>
              <div className="space-y-3">
                {active.map((po) => <POCard key={po.id} po={po} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Completed</h2>
              <div className="space-y-3">
                {completed.map((po) => <POCard key={po.id} po={po} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function POCard({ po }: { po: PO }) {
  const total = po.lines.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitCost), 0)
  const isOverdue =
    po.expectedDeliveryDate &&
    po.status !== 'RECEIVED' &&
    new Date(po.expectedDeliveryDate) < new Date()

  return (
    <Link href={`/orders/${po.id}`}
      className="block bg-white border rounded-2xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium font-mono text-sm">{po.orderNumber}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[po.status]}`}>
              {STATUS_LABELS[po.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{po.lines.length} material{po.lines.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold font-mono">EGP {total.toFixed(2)}</p>
          {po.expectedDeliveryDate && (
            <p className={`text-xs mt-0.5 flex items-center gap-1 justify-end ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isOverdue ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      {po.lines.slice(0, 2).map((l, i) => (
        <p key={i} className="text-xs text-muted-foreground mt-2 truncate">· {l.material.name}</p>
      ))}
      {po.lines.length > 2 && (
        <p className="text-xs text-muted-foreground mt-0.5">+ {po.lines.length - 2} more</p>
      )}
    </Link>
  )
}
