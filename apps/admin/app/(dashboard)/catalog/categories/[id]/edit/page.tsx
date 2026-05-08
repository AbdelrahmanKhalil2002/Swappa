'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { get, patch } from '../../../../../../lib/api-client'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  parent: { id: string; name: string } | null
}

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', description: '', parentId: '' })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      get<Category>(`/catalog/categories/${id}`),
      get<Category[]>('/catalog/categories'),
    ]).then(([cat, all]) => {
      setForm({
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? '',
        parentId: cat.parentId ?? '',
      })
      setAllCategories(all.filter((c) => c.id !== id))
      setLoaded(true)
    })
  }, [id])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await patch(`/catalog/categories/${id}`, {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        parentId: form.parentId || undefined,
      })
      router.push('/catalog/categories')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <Link
        href="/catalog/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to categories
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">Edit category</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Slug</label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Parent category</label>
          <select
            value={form.parentId}
            onChange={(e) => set('parentId', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">None (top-level)</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            href="/catalog/categories"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
