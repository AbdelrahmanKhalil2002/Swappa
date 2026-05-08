'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Layers, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { get, del } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'
import { EmptyState } from '../../../../components/ui/empty-state'
import { StatusBadge } from '../../../../components/ui/status-badge'

interface Shoe {
  id: string
  name: string
  slug: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  basePrice: string
  category: { name: string } | null
  _count: { variants: number; compatibility: number }
}

interface Page {
  items: Shoe[]
  total: number
  page: number
  pages: number
}

export default function ShoesPage() {
  const [data, setData] = useState<Page | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load(p: number) {
    setLoading(true)
    try {
      const res = await get<Page>(`/catalog/shoes?page=${p}&limit=20`)
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All variants and compatibility data will also be deleted.`)) return
    setDeleting(id)
    try {
      await del(`/catalog/shoes/${id}`)
      load(page)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Base Shoes"
        description="Manage the shoe models that accept interchangeable heels."
        action={
          <Link
            href="/catalog/shoes/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New shoe
          </Link>
        }
      />

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No base shoes yet"
            description="Add your first shoe model to start building the catalog."
            action={
              <Link
                href="/catalog/shoes/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg"
              >
                <Plus className="w-4 h-4" />
                New shoe
              </Link>
            }
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Variants</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((shoe) => (
                  <tr key={shoe.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{shoe.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{shoe.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shoe.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {shoe.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      EGP {Number(shoe.basePrice).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {shoe._count.variants}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/catalog/shoes/${shoe.id}/compatibility`}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          title="Compatibility matrix"
                        >
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        <Link
                          href={`/catalog/shoes/${shoe.id}`}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        <button
                          onClick={() => handleDelete(shoe.id, shoe.name)}
                          disabled={deleting === shoe.id}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-40"
                          title="Delete"
                        >
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
                <p className="text-sm text-muted-foreground">
                  {data.total} shoes · page {data.page} of {data.pages}
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
