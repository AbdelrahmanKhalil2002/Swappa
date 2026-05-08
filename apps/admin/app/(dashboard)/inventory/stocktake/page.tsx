'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { get, post } from '../../../../lib/api-client'

interface StocktakeRow {
  variantId: string
  sku: string
  size: string
  color: string
  shoeName: string
  quantity: number
  reserved: number
  available: number
  threshold: number
}

export default function StocktakePage() {
  const [rows, setRows] = useState<StocktakeRow[]>([])
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    get<StocktakeRow[]>('/inventory/stocktake')
      .then((data) => {
        setRows(data)
        // Pre-fill inputs with current expected counts
        const initial: Record<string, string> = {}
        for (const r of data) initial[r.variantId] = String(r.quantity)
        setCounts(initial)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm('Submit stocktake? All physical counts will be applied and movements logged.')) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const items = Object.entries(counts)
        .filter(([, v]) => v !== '')
        .map(([variantId, physicalCount]) => ({
          variantId,
          physicalCount: parseInt(physicalCount, 10),
        }))
      await post('/inventory/stocktake', { items })
      setSaved(true)
      // Reload expected counts
      const data = await get<StocktakeRow[]>('/inventory/stocktake')
      setRows(data)
      const updated: Record<string, string> = {}
      for (const r of data) updated[r.variantId] = String(r.quantity)
      setCounts(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stocktake failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = search
    ? rows.filter((r) =>
        r.shoeName.toLowerCase().includes(search.toLowerCase()) ||
        r.sku.toLowerCase().includes(search.toLowerCase()),
      )
    : rows

  const changedCount = rows.filter(
    (r) => counts[r.variantId] !== '' && counts[r.variantId] !== String(r.quantity),
  ).length

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link href="/inventory" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Inventory
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Stocktake</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter physical counts for each variant. Only changed rows will be updated.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {changedCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">{changedCount} change{changedCount !== 1 ? 's' : ''}</span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by shoe or SKU…"
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 w-64"
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="bg-surface border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variant</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reserved</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-36">Physical count</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((row) => {
                const physical = counts[row.variantId] !== undefined ? parseInt(counts[row.variantId] || '0', 10) : row.quantity
                const variance = isNaN(physical) ? 0 : physical - row.quantity
                const isLow = (physical - row.reserved) < row.threshold
                const changed = counts[row.variantId] !== String(row.quantity)
                return (
                  <tr key={row.variantId} className={`transition-colors ${changed ? 'bg-amber-50/40' : 'hover:bg-muted/20'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.shoeName}</p>
                      <p className="text-xs text-muted-foreground">
                        Size {row.size} · {row.color} · <span className="font-mono">{row.sku}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{row.reserved}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={counts[row.variantId] ?? String(row.quantity)}
                        onChange={(e) => setCounts((prev) => ({ ...prev, [row.variantId]: e.target.value }))}
                        className={`w-24 px-2 py-1 border rounded text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 ${changed ? 'border-amber-400' : ''}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={variance === 0 ? 'text-muted-foreground' : variance > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {variance === 0 ? '—' : variance > 0 ? `+${variance}` : `${variance}`}
                      </span>
                      {isLow && <AlertTriangle className="w-3 h-3 text-red-400 inline ml-1" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{rows.length} variants total</p>
          <button
            type="submit"
            disabled={saving || changedCount === 0}
            className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : `Submit stocktake${changedCount > 0 ? ` (${changedCount})` : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
