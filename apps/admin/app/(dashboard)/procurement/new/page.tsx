'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { get, post } from '../../../../lib/api-client'

interface Supplier { id: string; name: string; code: string }
interface Material { id: string; name: string; sku: string; unit: string; costPerUnit: string }

interface LineItem { materialId: string; quantityOrdered: string; unitCost: string }

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'
const UOM_LABELS: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }

export default function NewPOPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ materialId: '', quantityOrdered: '', unitCost: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      get<{ items: Supplier[] }>('/procurement/suppliers?limit=200'),
      get<{ items: Material[] }>('/raw-materials?limit=200'),
    ]).then(([s, m]) => { setSuppliers(s.items); setMaterials(m.items) })
  }, [])

  function updateLine(i: number, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() { setLines((prev) => [...prev, { materialId: '', quantityOrdered: '', unitCost: '' }]) }
  function removeLine(i: number) { setLines((prev) => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter((l) => l.materialId && l.quantityOrdered && l.unitCost)
    if (!supplierId || validLines.length === 0) { setError('Select a supplier and add at least one line'); return }
    setSaving(true); setError('')
    try {
      const po = await post<{ id: string }>('/procurement/orders', {
        supplierId,
        expectedDeliveryDate: deliveryDate || undefined,
        notes: notes || undefined,
        lines: validLines.map((l) => ({
          materialId: l.materialId,
          quantityOrdered: parseFloat(l.quantityOrdered),
          unitCost: parseFloat(l.unitCost),
        })),
      })
      router.push(`/procurement/${po.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setSaving(false)
    }
  }

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantityOrdered) || 0) * (parseFloat(l.unitCost) || 0), 0)

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/procurement" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Purchase Orders
      </Link>
      <h1 className="text-xl font-semibold mb-6">New purchase order</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Supplier *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls} required>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Expected delivery</label>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>

        {/* Lines */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Materials</h2>
            {total > 0 && <span className="text-sm font-medium">Total: EGP {total.toFixed(2)}</span>}
          </div>
          <div className="divide-y">
            {lines.map((line, i) => {
              const mat = materials.find((m) => m.id === line.materialId)
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-2">
                  <select value={line.materialId} onChange={(e) => {
                    const m = materials.find((m) => m.id === e.target.value)
                    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, materialId: e.target.value, unitCost: m ? m.costPerUnit : l.unitCost } : l))
                  }} className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background">
                    <option value="">Select material…</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                  </select>
                  <input type="number" min="0.0001" step="any" value={line.quantityOrdered}
                    onChange={(e) => updateLine(i, 'quantityOrdered', e.target.value)}
                    placeholder={`Qty ${mat ? `(${UOM_LABELS[mat.unit] ?? mat.unit})` : ''}`}
                    className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                  <input type="number" min="0.0001" step="0.0001" value={line.unitCost}
                    onChange={(e) => updateLine(i, 'unitCost', e.target.value)}
                    placeholder="Cost/unit"
                    className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t bg-muted/20">
            <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add line
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Creating…' : 'Create PO'}
        </button>
      </form>
    </div>
  )
}
