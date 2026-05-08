'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { get, del } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'
import { EmptyState } from '../../../../components/ui/empty-state'
import { StatusBadge } from '../../../../components/ui/status-badge'

interface HeelStyle {
  id: string; name: string; slug: string; type: string; heightCm: number
  addedPrice: string; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  _count: { compatibility: number }
}

export default function HeelStylesPage() {
  const [heels, setHeels] = useState<HeelStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    try { setHeels(await get<HeelStyle[]>('/catalog/heel-styles')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    setDeleting(id)
    try { await del(`/catalog/heel-styles/${id}`); setHeels((h) => h.filter((x) => x.id !== id)) }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Heel Styles"
        description="Swappable heel modules that attach to base shoes."
        action={
          <Link
            href="/catalog/heel-styles/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New heel style
          </Link>
        }
      />

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : heels.length === 0 ? (
          <EmptyState
            title="No heel styles yet"
            description="Create heel style modules to attach to base shoes."
            action={
              <Link href="/catalog/heel-styles/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg">
                <Plus className="w-4 h-4" /> New heel style
              </Link>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Height</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">+Price</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Shoes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {heels.map((h) => (
                <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{h.type.toLowerCase()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{h.heightCm} cm</td>
                  <td className="px-4 py-3"><StatusBadge status={h.status} /></td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {Number(h.addedPrice) > 0 ? `+EGP ${Number(h.addedPrice).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{h._count.compatibility}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/catalog/heel-styles/${h.id}`} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                      <button onClick={() => handleDelete(h.id, h.name)} disabled={deleting === h.id}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
