'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { get } from '../../../lib/api-client'

type Status = 'PLANNED' | 'IN_PROGRESS' | 'QC_PENDING' | 'QC_REJECTED' | 'COMPLETED' | 'CANCELLED'

interface ProductionOrder {
  id: string
  orderNumber: string
  status: Status
  currentStage: string | null
  quantity: number
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { name: string }
  }
}

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-gray-700 text-gray-300',
  IN_PROGRESS: 'bg-blue-900 text-blue-300',
  QC_PENDING: 'bg-amber-900 text-amber-300',
  QC_REJECTED: 'bg-red-900 text-red-300',
  COMPLETED: 'bg-emerald-900 text-emerald-300',
  CANCELLED: 'bg-gray-800 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  QC_PENDING: 'QC Pending',
  QC_REJECTED: 'QC Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const ACTIVE_STATUSES: Status[] = ['PLANNED', 'IN_PROGRESS', 'QC_PENDING', 'QC_REJECTED']

export default function DashboardPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await get<{ items: ProductionOrder[] }>(
        '/manufacturing/factory/orders?limit=50',
      )
      setOrders(res.items)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const displayed =
    filter === 'all'
      ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
      : orders.filter((o) => o.status === filter)

  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Production Orders</h1>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', ...ACTIVE_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-accent text-accent-foreground'
                : 'bg-surface text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'Active' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No orders to show.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="block bg-surface border rounded-2xl p-4 active:scale-98 transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{o.variant.baseShoe.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Size {o.variant.size} · {o.variant.color}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{o.orderNumber}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1.5">{o.quantity} units</p>
                </div>
              </div>
              {o.currentStage && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Current stage:{' '}
                    <span className="text-accent font-medium">{o.currentStage}</span>
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
