'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers, Plus, Trash2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { get, patch, post, del, put, upload } from '../../../../../lib/api-client'
import { StatusBadge } from '../../../../../components/ui/status-badge'

interface Category { id: string; name: string }
interface Media { id: string; url: string; alt: string | null; position: number; type: 'GALLERY' | 'FRAME_360' }
interface Variant { id: string; size: string; color: string; material: string | null; sku: string; stock: number }
interface Shoe {
  id: string; name: string; slug: string; description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'; categoryId: string | null
  basePrice: string; seoTitle: string | null; seoDescription: string | null
  category: { id: string; name: string } | null
  media: Media[]; variants: Variant[]
}

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export default function ShoeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [shoe, setShoe] = useState<Shoe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaTab, setMediaTab] = useState<'GALLERY' | 'FRAME_360'>('GALLERY')
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [variantForm, setVariantForm] = useState({ size: '', color: '', material: '', sku: '', stock: '0' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '', slug: '', description: '', status: 'DRAFT' as typeof STATUS_OPTIONS[number],
    categoryId: '', basePrice: '', seoTitle: '', seoDescription: '',
  })

  async function load() {
    const [s, cats] = await Promise.all([
      get<Shoe>(`/catalog/shoes/id/${id}`),
      get<Category[]>('/catalog/categories'),
    ])
    setShoe(s)
    setCategories(cats)
    setForm({
      name: s.name, slug: s.slug, description: s.description ?? '',
      status: s.status, categoryId: s.categoryId ?? '', basePrice: s.basePrice,
      seoTitle: s.seoTitle ?? '', seoDescription: s.seoDescription ?? '',
    })
  }

  useEffect(() => { load() }, [id])

  function setF(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await patch(`/catalog/shoes/${id}`, {
        name: form.name, slug: form.slug || undefined,
        description: form.description || undefined, status: form.status,
        categoryId: form.categoryId || undefined, basePrice: parseFloat(form.basePrice),
        seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined,
      })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); if (!files.length) return
    setUploading(true)
    try {
      const mediaOfType = shoe!.media.filter((m) => m.type === mediaTab)
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData()
        fd.append('file', files[i])
        fd.append('folder', 'base-shoes')
        fd.append('alt', files[i].name)
        fd.append('position', String(mediaOfType.length + i))
        fd.append('type', mediaTab)
        fd.append('baseShoeId', id)
        await upload('/media/upload', fd)
      }
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm('Remove this image?')) return
    try { await del(`/media/${mediaId}`); await load() }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault()
    try {
      await post('/catalog/shoes/' + id + '/variants', {
        size: variantForm.size, color: variantForm.color,
        material: variantForm.material || undefined,
        sku: variantForm.sku, stock: parseInt(variantForm.stock),
        baseShoeId: id,
      })
      setVariantForm({ size: '', color: '', material: '', sku: '', stock: '0' })
      setShowVariantForm(false)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to add variant') }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!confirm('Delete this variant?')) return
    try {
      await del(`/catalog/shoes/${id}/variants/${variantId}`)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
  }

  if (!shoe) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/catalog/shoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to shoes
        </Link>
        <Link
          href={`/catalog/shoes/${id}/compatibility`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Layers className="w-4 h-4" />
          Compatibility matrix
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{shoe.name}</h1>
        <StatusBadge status={shoe.status} />
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Details */}
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
              <label className="block text-sm font-medium mb-1.5">Base price (EGP)</label>
              <input type="number" min="0" step="0.01" value={form.basePrice}
                onChange={(e) => setF('basePrice', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setF('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select value={form.categoryId} onChange={(e) => setF('categoryId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
              {(['GALLERY', 'FRAME_360'] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => setMediaTab(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mediaTab === t ? 'bg-surface shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'GALLERY' ? 'Gallery' : '360° Frames'}
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    {shoe.media.filter((m) => m.type === t).length}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : mediaTab === 'FRAME_360' ? 'Upload frames' : 'Upload image'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              multiple={mediaTab === 'FRAME_360'} className="hidden" onChange={handleImageUpload} />
          </div>
          {mediaTab === 'FRAME_360' && (
            <p className="text-xs text-muted-foreground">Upload frames in order (e.g. 01.jpg → 24.jpg). They will display as a drag-to-rotate viewer on the storefront.</p>
          )}
          {shoe.media.filter((m) => m.type === mediaTab).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mediaTab === 'GALLERY' ? 'No gallery images yet.' : 'No 360° frames yet. Upload a sequence of images.'}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {shoe.media.filter((m) => m.type === mediaTab).map((m) => (
                <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                  <Image src={m.url} alt={m.alt ?? ''} fill className="object-cover" sizes="150px" />
                  {mediaTab === 'FRAME_360' && (
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      #{m.position + 1}
                    </div>
                  )}
                  <button type="button" onClick={() => handleDeleteMedia(m.id)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO */}
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

      {/* Variants */}
      <div className="mt-8 bg-surface border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Size & colour variants</h2>
          <button onClick={() => setShowVariantForm(!showVariantForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-muted transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add variant
          </button>
        </div>

        {showVariantForm && (
          <form onSubmit={handleAddVariant} className="px-5 py-4 border-b bg-muted/30">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(['size', 'color', 'material', 'sku'] as const).map((f) => (
                <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  value={variantForm[f]} onChange={(e) => setVariantForm((v) => ({ ...v, [f]: e.target.value }))}
                  required={f !== 'material'}
                  className="px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40" />
              ))}
              <input type="number" min="0" placeholder="Stock"
                value={variantForm.stock} onChange={(e) => setVariantForm((v) => ({ ...v, stock: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="px-3 py-1.5 bg-foreground text-background text-sm rounded-lg">Add</button>
              <button type="button" onClick={() => setShowVariantForm(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
            </div>
          </form>
        )}

        {shoe.variants.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No variants yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Size', 'Color', 'Material', 'SKU', 'Stock', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shoe.variants.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2.5">{v.size}</td>
                  <td className="px-4 py-2.5">{v.color}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.material ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-2.5">{v.stock}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDeleteVariant(v.id)}
                      className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
