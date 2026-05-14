'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Minus, Trash2, Package, AlertTriangle } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'

const CATEGORIES = ['LEATHER', 'HARDWARE', 'COMPONENTS', 'ADHESIVES', 'PACKAGING', 'OTHER']
const UOMS = [
  { value: 'UNITS', label: 'Units' }, { value: 'METERS', label: 'Meters (m)' },
  { value: 'SQM', label: 'Sq. Meters (m²)' }, { value: 'KG', label: 'Kilograms (kg)' },
  { value: 'GRAMS', label: 'Grams (g)' }, { value: 'LITERS', label: 'Liters (L)' },
  { value: 'ML', label: 'Milliliters (mL)' },
]
const UOM_LABELS: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }

const TYPE_COLORS: Record<string, string> = {
  RECEIVED: 'text-emerald-600 bg-emerald-50', ADJUSTMENT: 'text-amber-600 bg-amber-50',
  WRITE_OFF: 'text-red-600 bg-red-50', CONSUMED: 'text-blue-600 bg-blue-50', STOCKTAKE: 'text-gray-600 bg-gray-100',
}

interface Material {
  id: string; name: string; sku: string; description: string | null
  category: string; unit: string; costPerUnit: string; supplier: string | null
  minStockLevel: string; quantity: number; isLowStock: boolean
}
interface Movement {
  id: string; type: string; quantityDelta: string; quantityAfter: string
  costPerUnit: string | null; reason: string | null; reference: string | null; createdAt: string
}

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [material, setMaterial] = useState<Material | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<Material>>({})

  // Stock forms
  const [receiveQty, setReceiveQty] = useState(''); const [receiveCost, setReceiveCost] = useState(''); const [receiveRef, setReceiveRef] = useState('')
  const [adjDelta, setAdjDelta] = useState(''); const [adjReason, setAdjReason] = useState('')
  const [woQty, setWoQty] = useState(''); const [woReason, setWoReason] = useState('')

  async function load() {
    try {
      const [m, mv] = await Promise.all([
        get<Material>(`/raw-materials/${id}`),
        get<{ items: Movement[] }>(`/raw-materials/${id}/movements?limit=20`),
      ])
      setMaterial(m)
      setForm({ name: m.name, description: m.description ?? '', category: m.category, unit: m.unit, costPerUnit: m.costPerUnit, supplier: m.supplier ?? '', minStockLevel: m.minStockLevel })
      setMovements(mv.items)
    } catch { /* noop */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await patch(`/raw-materials/${id}`, { ...form, costPerUnit: parseFloat(String(form.costPerUnit)), minStockLevel: parseFloat(String(form.minStockLevel)) })
      await load(); setEditMode(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try { await post(`/raw-materials/${id}/receive`, { quantity: parseFloat(receiveQty), costPerUnit: parseFloat(receiveCost), reference: receiveRef || undefined }); setReceiveQty(''); setReceiveCost(''); setReceiveRef(''); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try { await patch(`/raw-materials/${id}/adjust`, { delta: parseFloat(adjDelta), reason: adjReason }); setAdjDelta(''); setAdjReason(''); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function handleWriteOff(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(`Write off ${woQty} units?`)) return
    setSaving(true); setError('')
    try { await post(`/raw-materials/${id}/write-off`, { quantity: parseFloat(woQty), reason: woReason }); setWoQty(''); setWoReason(''); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 flex items-center justify-center min-h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (!material) return null

  const uomLabel = UOM_LABELS[material.unit] ?? material.unit

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/raw-materials" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Raw Materials
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{material.name}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{material.sku}</p>
        </div>
        <button onClick={() => setEditMode(!editMode)} className="text-sm text-accent hover:underline">{editMode ? 'Cancel' : 'Edit'}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Stock cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">In Stock</p>
              <p className={`text-2xl font-semibold font-mono ${material.isLowStock ? 'text-red-600' : ''}`}>
                {material.quantity.toFixed(material.unit === 'UNITS' ? 0 : 3)} <span className="text-sm font-normal text-muted-foreground">{uomLabel}</span>
              </p>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Cost/unit</p>
              <p className="text-2xl font-semibold font-mono">EGP {Number(material.costPerUnit).toFixed(4)}</p>
            </div>
          </div>

          {material.isLowStock && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Stock below minimum level of {Number(material.minStockLevel).toFixed(2)} {uomLabel}.
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Edit form */}
          {editMode && (
            <form onSubmit={handleSave} className="border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold mb-2">Edit material</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name</label><input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
                <div><label className="text-xs text-muted-foreground">Supplier</label><input value={form.supplier ?? ''} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Category</label>
                  <select value={form.category ?? ''} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Unit</label>
                  <select value={form.unit ?? ''} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={inputCls}>
                    {UOMS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Cost/unit (EGP)</label><input type="number" step="0.0001" value={form.costPerUnit ?? ''} onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))} className={inputCls} /></div>
                <div><label className="text-xs text-muted-foreground">Min stock level</label><input type="number" step="0.01" value={form.minStockLevel ?? ''} onChange={(e) => setForm((f) => ({ ...f, minStockLevel: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Description</label><textarea value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
              </button>
            </form>
          )}

          {/* Receive */}
          <div className="border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" />Receive stock</h2>
            <form onSubmit={handleReceive} className="flex gap-2 flex-wrap">
              <input type="number" min="0.0001" step="any" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} placeholder={`Qty (${uomLabel})`} className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <input type="number" min="0" step="0.0001" value={receiveCost} onChange={(e) => setReceiveCost(e.target.value)} placeholder="Cost/unit (EGP)" className="w-36 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <input value={receiveRef} onChange={(e) => setReceiveRef(e.target.value)} placeholder="Reference (PO #)" className="flex-1 min-w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <button type="submit" disabled={saving || !receiveQty || !receiveCost} className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors">Add</button>
            </form>
          </div>

          {/* Adjust */}
          <div className="border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Minus className="w-4 h-4 text-amber-600" />Manual adjustment</h2>
            <form onSubmit={handleAdjust} className="flex gap-2">
              <input type="number" step="any" value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} placeholder={`Delta (e.g. -2.5 ${uomLabel})`} className="w-44 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Reason (required)" className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <button type="submit" disabled={saving || !adjReason} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">Apply</button>
            </form>
          </div>

          {/* Write-off */}
          <div className="border border-red-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-red-700"><Trash2 className="w-4 h-4" />Write off</h2>
            <form onSubmit={handleWriteOff} className="flex gap-2">
              <input type="number" min="0.0001" step="any" value={woQty} onChange={(e) => setWoQty(e.target.value)} placeholder={`Qty (${uomLabel})`} className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <input value={woReason} onChange={(e) => setWoReason(e.target.value)} placeholder="Reason" className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <button type="submit" disabled={saving || !woReason} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">Write off</button>
            </form>
          </div>
        </div>

        {/* Movement log */}
        <div className="border rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b bg-muted/30"><h2 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" />Movements</h2></div>
          {movements.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">No movements yet.</p>
          ) : (
            <div className="divide-y max-h-[560px] overflow-y-auto">
              {movements.map((m) => {
                const delta = Number(m.quantityDelta)
                return (
                  <div key={m.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type] ?? 'bg-muted'}`}>{m.type.replace('_', ' ')}</span>
                      <span className={`text-xs font-mono font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {delta > 0 ? `+${delta}` : delta} {uomLabel}
                      </span>
                    </div>
                    {m.costPerUnit && <p className="text-xs text-muted-foreground">EGP {Number(m.costPerUnit).toFixed(4)}/unit</p>}
                    {m.reason && <p className="text-xs text-muted-foreground">{m.reason}</p>}
                    {m.reference && <p className="text-xs text-muted-foreground font-mono">{m.reference}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}after: {Number(m.quantityAfter).toFixed(3)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
