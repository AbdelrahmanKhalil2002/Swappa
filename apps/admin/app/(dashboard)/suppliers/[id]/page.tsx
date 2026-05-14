'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, CheckCircle2, Loader2, TrendingUp } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'

interface Supplier {
  id: string; name: string; code: string; contactName: string | null
  contactEmail: string; contactPhone: string | null; website: string | null
  paymentTerms: string | null; notes: string | null; isActive: boolean
}

interface Performance {
  totalOrders: number; onTimeRate: number | null
  avgDeliveryDays: number | null; totalSpend: number
}

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'
const PORTAL_URL = process.env.NEXT_PUBLIC_SUPPLIER_PORTAL_URL ?? 'http://localhost:3003'

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [perf, setPerf] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<Supplier>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      get<Supplier>(`/procurement/suppliers/${id}`),
      get<Performance>(`/procurement/suppliers/${id}/performance`),
    ]).then(([s, p]) => {
      setSupplier(s); setForm(s); setPerf(p)
    }).catch(() => null).finally(() => setLoading(false))
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const updated = await patch<Supplier>(`/procurement/suppliers/${id}`, form)
      setSupplier(updated); setEditMode(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function handleRegenerateInvite() {
    const res = await post<{ inviteToken: string }>(`/procurement/suppliers/${id}/invite`, {})
    setInviteToken(res.inviteToken)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${PORTAL_URL}/accept-invite?token=${inviteToken}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 flex items-center justify-center min-h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (!supplier) return null

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Suppliers
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{supplier.code}</p>
        </div>
        <button onClick={() => setEditMode(!editMode)} className="text-sm text-accent hover:underline">
          {editMode ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="space-y-5">
        {/* Performance */}
        {perf && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total POs', value: perf.totalOrders },
              { label: 'On-time rate', value: perf.onTimeRate != null ? `${perf.onTimeRate}%` : 'N/A' },
              { label: 'Avg delivery', value: perf.avgDeliveryDays != null ? `${perf.avgDeliveryDays}d` : 'N/A' },
              { label: 'Total spend', value: `EGP ${perf.totalSpend.toFixed(0)}` },
            ].map(({ label, value }) => (
              <div key={label} className="border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold font-mono">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Info / Edit */}
        {editMode ? (
          <form onSubmit={handleSave} className="border rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-muted-foreground">Code</label><input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Contact name</label><input value={form.contactName ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input value={form.contactPhone ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Website</label><input value={form.website ?? ''} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-muted-foreground">Payment terms</label><input value={form.paymentTerms ?? ''} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} className={inputCls} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Notes</label><textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving} className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </form>
        ) : (
          <div className="border rounded-xl divide-y text-sm">
            {[
              ['Email', supplier.contactEmail],
              ['Contact', supplier.contactName ?? '—'],
              ['Phone', supplier.contactPhone ?? '—'],
              ['Website', supplier.website ?? '—'],
              ['Payment terms', supplier.paymentTerms ?? '—'],
              ['Notes', supplier.notes ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex px-4 py-3 gap-4">
                <p className="w-32 text-muted-foreground shrink-0">{label}</p>
                <p>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Portal access */}
        <div className="border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Supplier Portal access</h2>
            <button onClick={handleRegenerateInvite} className="text-xs text-accent hover:underline">
              {inviteToken ? 'Regenerate' : 'Generate invite link'}
            </button>
          </div>
          {inviteToken ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all">
                {`${PORTAL_URL}/accept-invite?token=${inviteToken}`}
              </code>
              <button onClick={copyLink} className="p-2 hover:bg-muted rounded-lg">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click "Generate invite link" to create a portal login link for this supplier.</p>
          )}
        </div>

        {/* POs shortcut */}
        <div className="flex items-center gap-3">
          <Link href={`/procurement?supplierId=${id}`} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
            <TrendingUp className="w-3.5 h-3.5" /> View purchase orders
          </Link>
        </div>
      </div>
    </div>
  )
}
