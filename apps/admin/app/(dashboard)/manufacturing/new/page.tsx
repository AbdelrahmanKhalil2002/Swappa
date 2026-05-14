'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { get, post } from '../../../../lib/api-client'

interface Variant {
  id: string
  sku: string
  size: string
  color: string
  baseShoe: { name: string }
}

const inputCls =
  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'

export default function NewProductionOrderPage() {
  const router = useRouter()
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [overhead, setOverhead] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    get<{ items: Variant[] }>('/catalog/variants?limit=200').then((r) =>
      setVariants(r.items),
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variantId || !quantity) return
    setSaving(true)
    setError('')
    try {
      const order = await post<{ id: string }>('/manufacturing', {
        variantId,
        quantity: parseInt(quantity),
        overheadCostPerUnit: overhead ? parseFloat(overhead) : undefined,
        notes: notes || undefined,
      })
      router.push(`/manufacturing/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <Link
        href="/manufacturing"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Manufacturing
      </Link>

      <h1 className="text-xl font-semibold mb-6">New production order</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Variant</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Select a variant…</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.baseShoe.name} — Size {v.size} · {v.color} ({v.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Quantity (units)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Overhead cost/unit (EGP)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={overhead}
              onChange={(e) => setOverhead(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Optional notes…"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving || !variantId || !quantity}
          className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Creating…' : 'Create order'}
        </button>
      </form>
    </div>
  )
}
