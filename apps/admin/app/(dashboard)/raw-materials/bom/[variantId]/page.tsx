'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { get, put } from '../../../../../lib/api-client'

interface Material {
  id: string; name: string; sku: string; unit: string; costPerUnit: string
}
interface BOMLine {
  id: string; materialId: string; quantityPerUnit: string; notes: string | null
  material: { id: string; name: string; sku: string; unit: string; costPerUnit: string }
}
interface BOM {
  id: string; variantId: string
  variant: { size: string; color: string; sku: string; baseShoe: { name: string } }
  lines: BOMLine[]
}

const UOM_LABELS: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }

export default function BomEditorPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const [bom, setBom] = useState<BOM | null>(null)
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Editable lines state
  const [lines, setLines] = useState<{ materialId: string; quantityPerUnit: string; notes: string }[]>([])

  // New line form
  const [newMaterialId, setNewMaterialId] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newNotes, setNewNotes] = useState('')

  useEffect(() => {
    Promise.all([
      get<BOM>(`/raw-materials/bom/${variantId}`),
      get<{ items: Material[] }>('/raw-materials?limit=200'),
    ]).then(([b, mats]) => {
      setBom(b)
      setAllMaterials(mats.items)
      setLines(b.lines.map((l) => ({
        materialId: l.materialId,
        quantityPerUnit: String(Number(l.quantityPerUnit)),
        notes: l.notes ?? '',
      })))
    }).catch(() => null).finally(() => setLoading(false))
  }, [variantId])

  function addLine() {
    if (!newMaterialId || !newQty) return
    if (lines.some((l) => l.materialId === newMaterialId)) return
    setLines((prev) => [...prev, { materialId: newMaterialId, quantityPerUnit: newQty, notes: newNotes }])
    setNewMaterialId(''); setNewQty(''); setNewNotes('')
    setSaved(false)
  }

  function removeLine(materialId: string) {
    setLines((prev) => prev.filter((l) => l.materialId !== materialId))
    setSaved(false)
  }

  function updateLine(materialId: string, field: 'quantityPerUnit' | 'notes', value: string) {
    setLines((prev) => prev.map((l) => l.materialId === materialId ? { ...l, [field]: value } : l))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      const updated = await put<BOM>(`/raw-materials/bom/${variantId}`, {
        lines: lines.map((l) => ({
          materialId: l.materialId,
          quantityPerUnit: parseFloat(l.quantityPerUnit),
          notes: l.notes || undefined,
        })),
      })
      setBom(updated)
      setSaved(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 flex items-center justify-center min-h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (!bom) return null

  const usedIds = new Set(lines.map((l) => l.materialId))
  const availableMaterials = allMaterials.filter((m) => !usedIds.has(m.id))

  const totalMaterialCost = lines.reduce((sum, l) => {
    const mat = allMaterials.find((m) => m.id === l.materialId)
    return sum + (parseFloat(l.quantityPerUnit) || 0) * Number(mat?.costPerUnit ?? 0)
  }, 0)

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/raw-materials/bom" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Bills of Materials
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">BOM — {bom.variant.baseShoe.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Size {bom.variant.size} · {bom.variant.color} · <span className="font-mono">{bom.variant.sku}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Lines */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Material lines</h2>
            {totalMaterialCost > 0 && (
              <span className="text-sm font-medium">Material cost: EGP {totalMaterialCost.toFixed(2)}</span>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-8 text-center">No materials added yet. Use the form below to add lines.</p>
          ) : (
            <div className="divide-y">
              {lines.map((line) => {
                const mat = allMaterials.find((m) => m.id === line.materialId)
                const unitCost = (parseFloat(line.quantityPerUnit) || 0) * Number(mat?.costPerUnit ?? 0)
                return (
                  <div key={line.materialId} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mat?.name ?? line.materialId}</p>
                      <p className="text-xs text-muted-foreground font-mono">{mat?.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number" min="0.0001" step="any" value={line.quantityPerUnit}
                        onChange={(e) => updateLine(line.materialId, 'quantityPerUnit', e.target.value)}
                        className="w-24 px-2 py-1 border rounded text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <span className="text-xs text-muted-foreground w-10">{UOM_LABELS[mat?.unit ?? ''] ?? ''}</span>
                      <input
                        value={line.notes} onChange={(e) => updateLine(line.materialId, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="w-36 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <span className="text-xs text-muted-foreground w-20 text-right font-mono">
                        {unitCost > 0 ? `EGP ${unitCost.toFixed(4)}` : '—'}
                      </span>
                      <button type="button" onClick={() => removeLine(line.materialId)}
                        className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add line */}
          <div className="px-5 py-3 border-t bg-muted/20 flex items-center gap-2">
            <select value={newMaterialId} onChange={(e) => setNewMaterialId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background">
              <option value="">Select material…</option>
              {availableMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
              ))}
            </select>
            <input type="number" min="0.0001" step="any" value={newQty} onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty per unit"
              className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
            <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes"
              className="w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
            <button type="button" onClick={addLine} disabled={!newMaterialId || !newQty}
              className="p-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-40 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save BOM'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
