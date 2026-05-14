'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Copy, CheckCircle2 } from 'lucide-react'
import { post } from '../../../../lib/api-client'

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background'

export default function NewSupplierPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', code: '', contactEmail: '', contactName: '', contactPhone: '', website: '', paymentTerms: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inviteResult, setInviteResult] = useState<{ supplierId: string; inviteToken: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const PORTAL_URL = process.env.NEXT_PUBLIC_SUPPLIER_PORTAL_URL ?? 'http://localhost:3003'

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await post<{ supplier: { id: string }; inviteToken: string }>('/procurement/suppliers', form)
      setInviteResult({ supplierId: res.supplier.id, inviteToken: res.inviteToken })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setSaving(false)
    }
  }

  function copyLink() {
    if (!inviteResult) return
    const link = `${PORTAL_URL}/accept-invite?token=${inviteResult.inviteToken}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteResult) {
    const link = `${PORTAL_URL}/accept-invite?token=${inviteResult.inviteToken}`
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-xl font-semibold mb-2">Supplier created</h1>
        <p className="text-sm text-muted-foreground mb-6">Copy the invite link below and send it to the supplier.</p>
        <div className="border rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium">Portal invite link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all">{link}</code>
            <button onClick={copyLink} className="shrink-0 p-2 hover:bg-muted rounded-lg transition-colors">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">This link expires in 7 days. You can regenerate it from the supplier page.</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => router.push(`/suppliers/${inviteResult.supplierId}`)} className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
            View supplier
          </button>
          <Link href="/suppliers" className="px-4 py-2 border text-sm font-medium rounded-xl hover:bg-muted transition-colors">Back to list</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Suppliers
      </Link>
      <h1 className="text-xl font-semibold mb-6">New supplier</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Name *</label><input value={form.name} onChange={(e) => set('name', e.target.value)} required className={inputCls} /></div>
          <div><label className="text-xs text-muted-foreground">Code *</label><input value={form.code} onChange={(e) => set('code', e.target.value)} required placeholder="e.g. SUP-001" className={inputCls} /></div>
        </div>
        <div><label className="text-xs text-muted-foreground">Contact email *</label><input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} required className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Contact name</label><input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-muted-foreground">Phone</label><input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Website</label><input value={form.website} onChange={(e) => set('website', e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-muted-foreground">Payment terms</label><input value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="e.g. Net 30" className={inputCls} /></div>
        </div>
        <div><label className="text-xs text-muted-foreground">Notes</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Creating…' : 'Create supplier'}
        </button>
      </form>
    </div>
  )
}
