'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { get, post } from '../../../../../lib/api-client'

interface Category { id: string; name: string }

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export default function NewShoePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'DRAFT' as typeof STATUS_OPTIONS[number],
    categoryId: '',
    basePrice: '',
    seoTitle: '',
    seoDescription: '',
  })

  useEffect(() => {
    get<Category[]>('/catalog/categories').then(setCategories).catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await post<{ id: string }>('/catalog/shoes', {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        status: form.status,
        categoryId: form.categoryId || undefined,
        basePrice: parseFloat(form.basePrice),
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
      })
      router.push(`/catalog/shoes/${res.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/catalog/shoes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shoes
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">New base shoe</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Core fields */}
        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Classic Pump"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Slug <span className="text-muted-foreground font-normal">(auto if blank)</span>
              </label>
              <input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="classic-pump"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Base price (EGP) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => set('basePrice', e.target.value)}
                placeholder="1200.00"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
              />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">SEO metadata</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Meta title <span className="text-muted-foreground font-normal">(max 120 chars)</span>
            </label>
            <input
              value={form.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Meta description <span className="text-muted-foreground font-normal">(max 160 chars)</span>
            </label>
            <textarea
              value={form.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
              maxLength={160}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create shoe'}
          </button>
          <Link href="/catalog/shoes" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
