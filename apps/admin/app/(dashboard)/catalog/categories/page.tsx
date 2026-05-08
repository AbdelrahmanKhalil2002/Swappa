'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { get, del } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'
import { EmptyState } from '../../../../components/ui/empty-state'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent: { id: string; name: string } | null
  _count: { children: number; baseShoes: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    try {
      const data = await get<Category[]>('/catalog/categories')
      setCategories(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await del(`/catalog/categories/${id}`)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Categories"
        description="Organise base shoes into browsable groups."
        action={
          <Link
            href="/catalog/categories/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New category
          </Link>
        }
      />

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create your first category to start organising products."
            action={
              <Link
                href="/catalog/categories/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg"
              >
                <Plus className="w-4 h-4" />
                New category
              </Link>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Shoes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.parent?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{cat._count.baseShoes}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/catalog/categories/${cat.id}/edit`}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deleting === cat.id}
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
        )}
      </div>
    </div>
  )
}
