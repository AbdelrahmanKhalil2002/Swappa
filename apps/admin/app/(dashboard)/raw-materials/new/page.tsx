'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { post } from '../../../../lib/api-client'

const CATEGORIES = ['LEATHER', 'HARDWARE', 'COMPONENTS', 'ADHESIVES', 'PACKAGING', 'OTHER']
const UOMS = [
  { value: 'UNITS', label: 'Units (pcs)' },
  { value: 'METERS', label: 'Meters (m)' },
  { value: 'SQM', label: 'Square Meters (m²)' },
  { value: 'KG', label: 'Kilograms (kg)' },
  { value: 'GRAMS', label: 'Grams (g)' },
  { value: 'LITERS', label: 'Liters (L)' },
  { value: 'ML', label: 'Milliliters (mL)' },
]

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'

export default function NewMaterialPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', sku: '', description: '', category: 'LEATHER', unit: 'UNITS',
    costPerUnit: '0', supplier: '', minStockLevel: '0',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await post('/raw-materials', {
        ...form,
        costPerUnit: parseFloat(form.costPerUnit),
        minStockLevel: parseFloat(form.minStockLevel),
      })
      router.push('/raw-materials')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create material') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/raw-materials" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Raw Materials
      </Link>
      <h1 className="text-xl font-semibold mb-6">New material</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full-grain leather" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU *</label>
            <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="MAT-LEATH-001" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
            placeholder="Optional description" className={`${inputCls} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category *</label>
            <select required value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit of measure *</label>
            <select required value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>
              {UOMS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost per unit (EGP)</label>
            <input type="number" min="0" step="0.0001" value={form.costPerUnit} onChange={(e) => set('costPerUnit', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Min stock level</label>
            <input type="number" min="0" step="0.01" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplier</label>
          <input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Supplier name or contact" className={inputCls} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Creating…' : 'Create material'}
          </button>
          <Link href="/raw-materials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
