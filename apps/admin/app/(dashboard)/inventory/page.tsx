'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

interface StockRow {
  id: string
  variantId: string
  quantity: number
  reserved: number
  available: number
  threshold: number
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { id: string; name: string; slug: string }
  }
}

interface PageData {
  items: StockRow[]
  total: number
  page: number
  pages: number
  threshold: number
}

export default function InventoryPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: number, q: string, ls: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (q) params.set('search', q)
      if (ls) params.set('lowStock', 'true')
      const res = await get<PageData>(`/inventory?${params}`)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, search, lowStockOnly) }, [page, search, lowStockOnly, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, search, lowStockOnly)
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Inventory"
        description="Track stock levels across all variants."
        action={
          <Link
            href="/inventory/stocktake"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />
            Stocktake
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or shoe name…"
            className="pl-8 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 w-64"
          />
        </form>
        <button
          onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1) }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            lowStockOnly ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-muted'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low stock only
        </button>
      </div>

      <div className="mt-4 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No inventory records"
            description="Stock levels will appear here once variants are created and stock is added."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variant</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">In Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reserved</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Available</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((row) => {
                  const isLow = row.available < (data.threshold ?? 5)
                  return (
                    <tr key={row.variantId} className={`hover:bg-muted/20 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.variant.baseShoe.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Size {row.variant.size} · {row.variant.color} · <span className="font-mono">{row.variant.sku}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{row.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{row.reserved}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-medium ${isLow ? 'text-red-600' : ''}`}>
                          {row.available}
                        </span>
                        {isLow && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1.5" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory/${row.variantId}`}
                          className="text-xs text-accent hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {data.total} variants · page {data.page} of {data.pages}
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
