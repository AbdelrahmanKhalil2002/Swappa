'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

interface Supplier {
  id: string
  name: string
  code: string
  contactName: string | null
  contactEmail: string
  contactPhone: string | null
  isActive: boolean
  _count: { purchaseOrders: number }
}

interface PageData { items: Supplier[]; total: number; page: number; pages: number }

export default function SuppliersPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    get<PageData>(`/procurement/suppliers?page=${page}&limit=30`)
      .then(setData).catch(() => null).finally(() => setLoading(false))
  }, [page])

  return (
    <div className="p-8">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory and portal access."
        action={
          <Link href="/suppliers/new" className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
            <Plus className="w-4 h-4" /> New supplier
          </Link>
        }
      />

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No suppliers yet" description="Add your first supplier to start creating purchase orders." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">POs</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/suppliers/${s.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{s.contactName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{s.contactEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{s._count.purchaseOrders}</td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">{data.total} suppliers · page {data.page} of {data.pages}</p>
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
