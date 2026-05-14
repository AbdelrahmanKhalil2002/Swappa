'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

type Status =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'QC_PENDING'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'

interface ProductionOrder {
  id: string
  orderNumber: string
  status: Status
  currentStage: string | null
  quantity: number
  materialCostPerUnit: string
  overheadCostPerUnit: string
  createdAt: string
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { name: string }
  }
}

interface PageData {
  items: ProductionOrder[]
  total: number
  page: number
  pages: number
}

const STATUS_STYLES: Record<Status, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  QC_PENDING: 'bg-amber-50 text-amber-700',
  QC_APPROVED: 'bg-emerald-50 text-emerald-700',
  QC_REJECTED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<Status, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  QC_PENDING: 'QC Pending',
  QC_APPROVED: 'QC Approved',
  QC_REJECTED: 'QC Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const ALL_STATUSES: Status[] = [
  'PLANNED',
  'IN_PROGRESS',
  'QC_PENDING',
  'QC_REJECTED',
  'COMPLETED',
  'CANCELLED',
]

export default function ManufacturingListPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<Status | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: '30' })
    if (status) qs.set('status', status)
    get<PageData>(`/manufacturing?${qs}`)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [page, status])

  return (
    <div className="p-8">
      <PageHeader
        title="Manufacturing"
        description="Track production orders from start to QC approval."
        action={
          <Link
            href="/manufacturing/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New order
          </Link>
        }
      />

      {/* Status filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => { setStatus(''); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === '' ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No production orders" description="Create a new order to begin tracking manufacturing." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost/unit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((o) => {
                  const totalCost =
                    Number(o.materialCostPerUnit) + Number(o.overheadCostPerUnit)
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => (window.location.href = `/manufacturing/${o.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.variant.baseShoe.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Size {o.variant.size} · {o.variant.color}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {o.currentStage ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{o.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {totalCost > 0 ? `EGP ${totalCost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {data.total} orders · page {data.page} of {data.pages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === data.pages}
                    className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
