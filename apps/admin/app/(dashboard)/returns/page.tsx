'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Loader2, RotateCcw } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'

interface ReturnRow {
  id: string
  returnNumber: string
  type: string
  reason: string
  status: string
  isInWarranty: boolean | null
  createdAt: string
  order: { orderNumber: string; firstName: string; lastName: string }
  items: { id: string }[]
  refund: { method: string; amount: string } | null
  createdBy: { firstName: string | null; lastName: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-50 text-yellow-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  INSPECTED: 'bg-purple-50 text-purple-700',
  RESOLVED: 'bg-emerald-50 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const STATUSES = ['', 'REQUESTED', 'RECEIVED', 'INSPECTED', 'RESOLVED', 'CLOSED']
const TYPES = ['', 'FULL_RETURN', 'SIZE_EXCHANGE', 'HEEL_STYLE_EXCHANGE', 'WARRANTY_CLAIM']

function ReturnsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [returns, setReturns] = useState<ReturnRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const status = params.get('status') ?? ''
  const type = params.get('type') ?? ''

  function setFilter(key: string, value: string) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value); else sp.delete(key)
    sp.delete('page')
    router.push(`/returns?${sp.toString()}`)
  }

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: '30' })
    if (status) qs.set('status', status)
    if (type) qs.set('type', type)
    get<{ items: ReturnRow[]; total: number }>(`/returns?${qs}`)
      .then((d) => { setReturns(d.items); setTotal(d.total) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [status, type, page])

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Returns" description={`${total} total returns`} />
        <Link href="/returns/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
          <Plus className="w-4 h-4" /> New return
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <select value={status} onChange={(e) => setFilter('status', e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type</label>
          <select value={type} onChange={(e) => setFilter('type', e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40">
            {TYPES.map((t) => <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : 'All types'}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : returns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RotateCcw className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No returns found.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-xs">Return #</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Items</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => router.push(`/returns/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.returnNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.order.orderNumber}</td>
                  <td className="px-4 py-3 text-xs">{r.order.firstName} {r.order.lastName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {r.status}
                    </span>
                    {r.isInWarranty && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">warranty</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.items.length}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 30 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{total} returns · page {page}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border rounded-lg hover:bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 30 >= total}
              className="px-3 py-1.5 border rounded-lg hover:bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
      <ReturnsContent />
    </Suspense>
  )
}
