'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Minus, Zap } from 'lucide-react'
import { get, post, put } from '../../../../../../lib/api-client'

interface HeelStyle {
  id: string; name: string; type: string; heightCm: number
}

interface CompatibilityRow {
  heelStyleId: string
  heelStyle: HeelStyle
  isCompatible: boolean | null
  notes: string | null
  recordId: string | null
}

interface Shoe { id: string; name: string; slug: string }

export default function CompatibilityPage() {
  const { id } = useParams<{ id: string }>()
  const [shoe, setShoe] = useState<Shoe | null>(null)
  const [rows, setRows] = useState<CompatibilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    try {
      const [shoeData, compat] = await Promise.all([
        get<Shoe>(`/catalog/shoes/${id}`),
        get<CompatibilityRow[]>(`/catalog/shoes/${id}/compatibility`),
      ])
      setShoe(shoeData)
      setRows(compat)
      const notes: Record<string, string> = {}
      compat.forEach((r) => { if (r.notes) notes[r.heelStyleId] = r.notes })
      setPendingNotes(notes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function toggle(heelStyleId: string, current: boolean | null) {
    const next = current === true ? false : true
    setSaving((s) => new Set(s).add(heelStyleId))
    try {
      await put(`/catalog/shoes/${id}/compatibility/one`, {
        heelStyleId,
        isCompatible: next,
        notes: pendingNotes[heelStyleId] || undefined,
      })
      setRows((prev) =>
        prev.map((r) => r.heelStyleId === heelStyleId ? { ...r, isCompatible: next } : r)
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving((s) => { const next = new Set(s); next.delete(heelStyleId); return next })
    }
  }

  async function saveNote(heelStyleId: string, isCompatible: boolean | null) {
    if (isCompatible === null) return
    setSaving((s) => new Set(s).add(heelStyleId))
    try {
      await put(`/catalog/shoes/${id}/compatibility/one`, {
        heelStyleId,
        isCompatible,
        notes: pendingNotes[heelStyleId] || undefined,
      })
      setRows((prev) =>
        prev.map((r) => r.heelStyleId === heelStyleId ? { ...r, notes: pendingNotes[heelStyleId] ?? null } : r)
      )
    } finally {
      setSaving((s) => { const next = new Set(s); next.delete(heelStyleId); return next })
    }
  }

  async function bulkEnable() {
    if (!confirm(`Mark ALL ${rows.length} heel styles as compatible with "${shoe?.name}"?\n\nYou can disable exceptions individually afterwards.`)) return
    setBulkLoading(true)
    try {
      await post(`/catalog/shoes/${id}/compatibility/bulk-enable`)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk enable failed')
    } finally {
      setBulkLoading(false)
    }
  }

  const compatible = rows.filter((r) => r.isCompatible === true).length
  const incompatible = rows.filter((r) => r.isCompatible === false).length
  const unset = rows.filter((r) => r.isCompatible === null).length

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link
        href={`/catalog/shoes/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {shoe?.name}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compatibility matrix</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define which heel styles fit <strong>{shoe?.name}</strong>.
          </p>
        </div>
        <button
          onClick={bulkEnable}
          disabled={bulkLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Zap className="w-4 h-4" />
          {bulkLoading ? 'Enabling…' : 'Enable all'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Compatible', count: compatible, color: 'text-emerald-600' },
          { label: 'Incompatible', count: incompatible, color: 'text-red-500' },
          { label: 'Not set', count: unset, color: 'text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className="bg-surface border rounded-xl p-4 text-center">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No heel styles exist yet.{' '}
          <Link href="/catalog/heel-styles/new" className="text-accent underline">
            Create one
          </Link>{' '}
          first.
        </p>
      ) : (
        <div className="bg-surface border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Heel style</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Height</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.heelStyleId} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{row.heelStyle.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {row.heelStyle.type.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.heelStyle.heightCm} cm</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(row.heelStyleId, row.isCompatible)}
                      disabled={saving.has(row.heelStyleId)}
                      title="Click to toggle"
                      className="inline-flex items-center justify-center p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      {saving.has(row.heelStyleId) ? (
                        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      ) : row.isCompatible === true ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : row.isCompatible === false ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Minus className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={pendingNotes[row.heelStyleId] ?? ''}
                      onChange={(e) =>
                        setPendingNotes((n) => ({ ...n, [row.heelStyleId]: e.target.value }))
                      }
                      onBlur={() => saveNote(row.heelStyleId, row.isCompatible)}
                      placeholder="Optional note…"
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-accent/40"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
