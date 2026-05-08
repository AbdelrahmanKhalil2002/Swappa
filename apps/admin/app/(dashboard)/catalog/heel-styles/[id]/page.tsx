'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { get, patch, del, upload } from '../../../../../lib/api-client'
import { StatusBadge } from '../../../../../components/ui/status-badge'

interface Media { id: string; url: string; alt: string | null }
interface HeelStyle {
  id: string; name: string; slug: string; description: string | null
  type: string; heightCm: number; material: string | null; addedPrice: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'; seoTitle: string | null; seoDescription: string | null
  media: Media[]
}

const TYPES = ['STILETTO', 'BLOCK', 'WEDGE', 'KITTEN', 'CONE', 'FLAT'] as const
const MATERIALS = ['METAL', 'WOOD', 'ACRYLIC', 'RUBBER'] as const
const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export default function HeelStyleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [heel, setHeel] = useState<HeelStyle | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '', slug: '', description: '', type: 'STILETTO' as typeof TYPES[number],
    heightCm: '', material: '' as typeof MATERIALS[number] | '',
    addedPrice: '0', status: 'DRAFT' as typeof STATUSES[number],
    seoTitle: '', seoDescription: '',
  })

  async function load() {
    const h = await get<HeelStyle>(`/catalog/heel-styles/id/${id}`)
    setHeel(h)
    setForm({
      name: h.name, slug: h.slug, description: h.description ?? '',
      type: h.type as typeof TYPES[number], heightCm: String(h.heightCm),
      material: (h.material ?? '') as typeof MATERIALS[number] | '',
      addedPrice: h.addedPrice, status: h.status,
      seoTitle: h.seoTitle ?? '', seoDescription: h.seoDescription ?? '',
    })
  }

  useEffect(() => { load() }, [id])

  function setF(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await patch(`/catalog/heel-styles/${id}`, {
        name: form.name, slug: form.slug || undefined, description: form.description || undefined,
        type: form.type, heightCm: parseFloat(form.heightCm),
        material: form.material || undefined, addedPrice: parseFloat(form.addedPrice || '0'),
        status: form.status, seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined,
      })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'heel-styles')
      fd.append('alt', file.name)
      fd.append('position', String(heel!.media.length))
      fd.append('heelStyleId', id)
      await upload('/media/upload', fd)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm('Remove this image?')) return
    try { await del(`/media/${mediaId}`); await load() }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
  }

  if (!heel) {
    return <div className="p-8 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/catalog/heel-styles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to heel styles
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{heel.name}</h1>
        <StatusBadge status={heel.status} />
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <input required value={form.name} onChange={(e) => setF('name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Slug</label>
              <input value={form.slug} onChange={(e) => setF('slug', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setF('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Type *</label>
              <select value={form.type} onChange={(e) => setF('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Height (cm) *</label>
              <input required type="number" min="0" step="0.5" value={form.heightCm} onChange={(e) => setF('heightCm', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Material</label>
              <select value={form.material} onChange={(e) => setF('material', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="">Not specified</option>
                {MATERIALS.map((m) => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Added price (EGP)</label>
              <input type="number" min="0" step="0.01" value={form.addedPrice} onChange={(e) => setF('addedPrice', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setF('description', e.target.value)} rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Images</h2>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
          </div>
          {heel.media.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {heel.media.map((m) => (
                <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                  <Image src={m.url} alt={m.alt ?? ''} fill className="object-cover" sizes="150px" />
                  <button type="button" onClick={() => handleDeleteMedia(m.id)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">SEO metadata</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Meta title</label>
            <input value={form.seoTitle} onChange={(e) => setF('seoTitle', e.target.value)} maxLength={120}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Meta description</label>
            <textarea value={form.seoDescription} onChange={(e) => setF('seoDescription', e.target.value)} maxLength={160} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
