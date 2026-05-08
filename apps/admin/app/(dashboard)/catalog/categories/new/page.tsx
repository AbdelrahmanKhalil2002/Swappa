'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { get, post } from '../../../../../lib/api-client'

interface Category {
  id: string
  name: string
}

export default function NewCategoryPage() {
  const router = useRouter()
  const [parents, setParents] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
  })

  useEffect(() => {
    get<Category[]>('/catalog/categories').then(setParents).catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await post('/catalog/categories', {
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

  return (
    <div className="p-8 max-w-xl">
      <Link
        href="/catalog/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to categories
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">New category</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Pumps"
            className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Slug <span className="text-muted-foreground font-normal">(auto-generated if blank)</span>
          </label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="pumps"
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
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
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
            {saving ? 'Saving…' : 'Create category'}
          </button>
          <Link
            href="/catalog/categories"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
