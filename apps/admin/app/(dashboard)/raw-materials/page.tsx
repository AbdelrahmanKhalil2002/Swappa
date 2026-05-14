'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { get, del } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

interface Material {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  supplier: string | null
  costPerUnit: string
  minStockLevel: string
  quantity: number
  isLowStock: boolean
}

interface PageData { items: Material[]; total: number; page: number; pages: number }

const CATEGORIES = ['LEATHER', 'HARDWARE', 'COMPONENTS', 'ADHESIVES', 'PACKAGING', 'OTHER']

const CATEGORY_COLORS: Record<string, string> = {
  LEATHER: 'bg-amber-50 text-amber-700',
  HARDWARE: 'bg-blue-50 text-blue-700',
  COMPONENTS: 'bg-purple-50 text-purple-700',
  ADHESIVES: 'bg-orange-50 text-orange-700',
  PACKAGING: 'bg-teal-50 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const UOM_LABELS: Record<string, string> = {
  UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL',
}

export default function RawMaterialsPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async (p: number, q: string, cat: string, ls: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (q) params.set('search', q)
      if (cat) params.set('category', cat)
      if (ls) params.set('lowStock', 'true')
      setData(await get<PageData>(`/raw-materials?${params}`))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, search, category, lowStockOnly) }, [page, search, category, lowStockOnly, load])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await del(`/raw-materials/${id}`)
      load(page, search, category, lowStockOnly)
    } catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Raw Materials"
        description="Track materials used in production and manage Bills of Materials."
        action={
          <div className="flex items-center gap-2">
            <Link href="/raw-materials/bom" className="inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              BOM Editor
            </Link>
            <Link href="/raw-materials/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors">
              <Plus className="w-4 h-4" /> New material
            </Link>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1) }} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, supplier…"
            className="pl-8 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 w-64" />
        </form>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => { setCategory(''); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${category === '' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${category === c ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${lowStockOnly ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-muted'}`}>
          <AlertTriangle className="w-3.5 h-3.5" /> Low stock
        </button>
      </div>

      <div className="mt-4 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No materials yet" description="Add your first raw material to start tracking stock." action={
            <Link href="/raw-materials/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg">
              <Plus className="w-4 h-4" /> New material
            </Link>
          } />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Material</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost/unit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((m) => (
                  <tr key={m.id} className={`hover:bg-muted/20 transition-colors ${m.isLowStock ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[m.category] ?? 'bg-muted text-foreground'}`}>
                        {m.category.charAt(0) + m.category.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{m.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-medium ${m.isLowStock ? 'text-red-600' : ''}`}>
                        {m.quantity.toFixed(m.unit === 'UNITS' ? 0 : 2)} {UOM_LABELS[m.unit]}
                      </span>
                      {m.isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      EGP {Number(m.costPerUnit).toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/raw-materials/${m.id}`} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        <button onClick={() => handleDelete(m.id, m.name)} disabled={deleting === m.id}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">{data.total} materials · page {data.page} of {data.pages}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page === data.pages} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
