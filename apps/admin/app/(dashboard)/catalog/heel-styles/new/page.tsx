'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { post } from '../../../../../lib/api-client'

const TYPES = ['STILETTO', 'BLOCK', 'WEDGE', 'KITTEN', 'CONE', 'FLAT'] as const
const MATERIALS = ['METAL', 'WOOD', 'ACRYLIC', 'RUBBER'] as const
const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export default function NewHeelStylePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    type: 'STILETTO' as typeof TYPES[number],
    heightCm: '', material: '' as typeof MATERIALS[number] | '',
    addedPrice: '0', status: 'DRAFT' as typeof STATUSES[number],
    seoTitle: '', seoDescription: '',
  })

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await post<{ id: string }>('/catalog/heel-styles', {
        name: form.name, slug: form.slug || undefined, description: form.description || undefined,
        type: form.type, heightCm: parseFloat(form.heightCm),
        material: form.material || undefined, addedPrice: parseFloat(form.addedPrice || '0'),
        status: form.status, seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined,
      })
      router.push(`/catalog/heel-styles/${res.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/catalog/heel-styles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to heel styles
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">New heel style</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 10cm Stiletto"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Slug <span className="text-muted-foreground font-normal">(auto if blank)</span></label>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="10cm-stiletto"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Type *</label>
              <select required value={form.type} onChange={(e) => set('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Height (cm) *</label>
              <input required type="number" min="0" step="0.5" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Material</label>
              <select value={form.material} onChange={(e) => set('material', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="">Not specified</option>
                {MATERIALS.map((m) => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Added price (EGP)</label>
              <input type="number" min="0" step="0.01" value={form.addedPrice} onChange={(e) => set('addedPrice', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
            </div>
          </div>
        </div>

        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">SEO metadata</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Meta title</label>
            <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} maxLength={120}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Meta description</label>
            <textarea value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} maxLength={160} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create heel style'}
          </button>
          <Link href="/catalog/heel-styles" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
