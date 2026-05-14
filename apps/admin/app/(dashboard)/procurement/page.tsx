'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

interface PO {
  id: string; orderNumber: string; status: POStatus; createdAt: string
  expectedDeliveryDate: string | null
  supplier: { name: string; code: string }
  lines: { quantityOrdered: string; unitCost: string }[]
}

interface PageData { items: PO[]; total: number; page: number; pages: number }

const STATUS_STYLES: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', CONFIRMED: 'Confirmed',
  PARTIALLY_RECEIVED: 'Partial', RECEIVED: 'Received', CANCELLED: 'Cancelled',
}

const ALL_STATUSES: POStatus[] = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']

function ProcurementContent() {
  const searchParams = useSearchParams()
  const supplierIdFilter = searchParams.get('supplierId')
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<POStatus | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: '30' })
    if (status) qs.set('status', status)
    if (supplierIdFilter) qs.set('supplierId', supplierIdFilter)
    get<PageData>(`/procurement/orders?${qs}`)
      .then(setData).catch(() => null).finally(() => setLoading(false))
  }, [page, status, supplierIdFilter])

  return (
    <div className="p-8">
      <PageHeader
        title="Purchase Orders"
        description="Track material procurement from order to receipt."
        action={
          <Link href="/procurement/new" className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
            <Plus className="w-4 h-4" /> New PO
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => { setStatus(''); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === '' ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80'}`}>
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80'}`}>
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
          <EmptyState title="No purchase orders" description="Create a PO to start procuring raw materials." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">PO Number</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Expected</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((po) => {
                  const total = po.lines.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitCost), 0)
                  return (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => (window.location.href = `/procurement/${po.id}`)}>
                      <td className="px-4 py-3 font-mono text-xs">{po.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p>{po.supplier.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{po.supplier.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[po.status]}`}>
                          {STATUS_LABELS[po.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {total > 0 ? `EGP ${total.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {po.expectedDeliveryDate
                          ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {new Date(po.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">{data.total} POs · page {data.page} of {data.pages}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page === data.pages} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProcurementPage() {
  return (
    <Suspense>
      <ProcurementContent />
    </Suspense>
  )
}
