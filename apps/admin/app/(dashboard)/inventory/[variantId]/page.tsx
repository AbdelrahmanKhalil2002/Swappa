'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Loader2, Plus, Minus, Trash2, Package } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'

interface StockLevel {
  id: string
  variantId: string
  quantity: number
  reserved: number
  available: number
  threshold: number
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { id: string; name: string; slug: string }
  }
}

interface StockMovement {
  id: string
  type: string
  quantityDelta: number
  reservedDelta: number
  quantityAfter: number
  reservedAfter: number
  reason: string | null
  reference: string | null
  createdAt: string
}

interface MovementsPage {
  items: StockMovement[]
  total: number
  page: number
  pages: number
}

const TYPE_COLORS: Record<string, string> = {
  RECEIVED: 'text-emerald-600 bg-emerald-50',
  RESERVED: 'text-blue-600 bg-blue-50',
  RELEASED: 'text-purple-600 bg-purple-50',
  ADJUSTMENT: 'text-amber-600 bg-amber-50',
  WRITE_OFF: 'text-red-600 bg-red-50',
  STOCKTAKE: 'text-gray-600 bg-gray-100',
}

function deltaLabel(d: number) {
  if (d === 0) return '—'
  return d > 0 ? `+${d}` : `${d}`
}

export default function InventoryDetailPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const [stock, setStock] = useState<StockLevel | null>(null)
  const [movements, setMovements] = useState<MovementsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Adjust form
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // Write-off form
  const [writeOffQty, setWriteOffQty] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')

  // Receive form
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveRef, setReceiveRef] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [sl, mv] = await Promise.all([
        get<StockLevel>(`/inventory/${variantId}`),
        get<MovementsPage>(`/inventory/${variantId}/movements?limit=20`),
      ])
      setStock(sl)
      setMovements(mv)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [variantId])

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault()
    if (!receiveQty || parseInt(receiveQty) < 1) return
    setSaving(true); setError('')
    try {
      await post(`/inventory/${variantId}/receive`, {
        quantity: parseInt(receiveQty),
        reference: receiveRef || undefined,
      })
      setReceiveQty(''); setReceiveRef('')
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustDelta || !adjustReason) return
    setSaving(true); setError('')
    try {
      await patch(`/inventory/${variantId}/adjust`, {
        delta: parseInt(adjustDelta),
        reason: adjustReason,
      })
      setAdjustDelta(''); setAdjustReason('')
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function handleWriteOff(e: React.FormEvent) {
    e.preventDefault()
    if (!writeOffQty || !writeOffReason) return
    if (!confirm(`Write off ${writeOffQty} units? This cannot be undone.`)) return
    setSaving(true); setError('')
    try {
      await post(`/inventory/${variantId}/write-off`, {
        quantity: parseInt(writeOffQty),
        reason: writeOffReason,
      })
      setWriteOffQty(''); setWriteOffReason('')
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stock) return null

  const isLow = stock.available < stock.threshold

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/inventory" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Inventory
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">{stock.variant.baseShoe.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Size {stock.variant.size} · {stock.variant.color} · <span className="font-mono">{stock.variant.sku}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: stock cards + forms */}
        <div className="lg:col-span-2 space-y-4">

          {/* Stock level cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'In Stock', value: stock.quantity, color: 'text-foreground' },
              { label: 'Reserved', value: stock.reserved, color: 'text-blue-600' },
              { label: 'Available', value: stock.available, color: isLow ? 'text-red-600' : 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-semibold font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {isLow && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Available stock is below the low-stock threshold of {stock.threshold}.
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Receive stock */}
          <div className="border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Receive stock
            </h2>
            <form onSubmit={handleReceive} className="flex gap-3">
              <input
                type="number" min="1" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)}
                placeholder="Quantity"
                className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={receiveRef} onChange={(e) => setReceiveRef(e.target.value)}
                placeholder="Reference (PO #, etc.)"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors">
                Add
              </button>
            </form>
          </div>

          {/* Manual adjustment */}
          <div className="border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Minus className="w-4 h-4 text-amber-600" />
              Manual adjustment
            </h2>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="Delta (e.g. -3 or +5)"
                  className="w-40 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <input
                  value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason (required)"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <button type="submit" disabled={saving || !adjustReason}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                Apply adjustment
              </button>
            </form>
          </div>

          {/* Write-off */}
          <div className="border rounded-xl p-5 border-red-100">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-red-700">
              <Trash2 className="w-4 h-4" />
              Write off stock
            </h2>
            <form onSubmit={handleWriteOff} className="flex gap-3">
              <input
                type="number" min="1" value={writeOffQty} onChange={(e) => setWriteOffQty(e.target.value)}
                placeholder="Qty"
                className="w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Reason (damaged, lost…)"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button type="submit" disabled={saving || !writeOffReason}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                Write off
              </button>
            </form>
          </div>
        </div>

        {/* Right: movement log */}
        <div className="border rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Movement log
            </h2>
          </div>
          {!movements || movements.items.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">No movements yet.</p>
          ) : (
            <div className="divide-y max-h-[520px] overflow-y-auto">
              {movements.items.map((m) => (
                <div key={m.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type] ?? 'bg-muted text-foreground'}`}>
                      {m.type.replace('_', ' ')}
                    </span>
                    <div className="text-xs font-mono text-right">
                      {m.quantityDelta !== 0 && (
                        <span className={m.quantityDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {deltaLabel(m.quantityDelta)}
                        </span>
                      )}
                      {m.reservedDelta !== 0 && (
                        <span className="text-blue-600 ml-1">r{deltaLabel(m.reservedDelta)}</span>
                      )}
                    </div>
                  </div>
                  {m.reason && <p className="text-xs text-muted-foreground">{m.reason}</p>}
                  {m.reference && <p className="text-xs text-muted-foreground font-mono">{m.reference}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' · '}qty: {m.quantityAfter}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
