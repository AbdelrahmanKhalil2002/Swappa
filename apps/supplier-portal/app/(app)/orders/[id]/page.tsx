'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react'
import { get, patch } from '../../../../lib/api-client'

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

interface PO {
  id: string; orderNumber: string; status: POStatus
  expectedDeliveryDate: string | null; notes: string | null; createdAt: string
  lines: {
    id: string; quantityOrdered: string; unitCost: string
    material: { name: string; sku: string; unit: string }
  }[]
  goodsReceipts: { id: string; status: string; confirmedAt: string | null }[]
}

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', CONFIRMED: 'Confirmed',
  PARTIALLY_RECEIVED: 'Partially Received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
}
const UOM: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }

export default function PortalOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [po, setPo] = useState<PO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    get<PO>(`/procurement/portal/orders/${id}`)
      .then((data) => { setPo(data); setNewDate(data.expectedDeliveryDate?.slice(0, 10) ?? '') })
      .catch(() => null).finally(() => setLoading(false))
  }, [id])

  async function handleDateUpdate() {
    if (!newDate) return
    setSaving(true); setError('')
    try {
      await patch(`/procurement/portal/orders/${id}/delivery-date`, { date: newDate })
      setPo((prev) => prev ? { ...prev, expectedDeliveryDate: newDate } : prev)
      setEditingDate(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (!po) return null

  const total = po.lines.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitCost), 0)
  const canEditDate = po.status !== 'RECEIVED' && po.status !== 'CANCELLED'
  const isOverdue = po.expectedDeliveryDate && po.status !== 'RECEIVED' && new Date(po.expectedDeliveryDate) < new Date()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="text-xl font-semibold font-mono">{po.orderNumber}</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {STATUS_LABELS[po.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Created {new Date(po.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Delivery date */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Expected delivery</h2>
          </div>
          {canEditDate && !editingDate && (
            <button onClick={() => setEditingDate(true)} className="text-xs text-accent hover:underline">
              Update date
            </button>
          )}
        </div>

        {editingDate ? (
          <div className="flex items-center gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
            <button onClick={handleDateUpdate} disabled={saving || !newDate}
              className="px-3 py-2 bg-foreground text-background text-sm rounded-lg hover:bg-foreground/90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditingDate(false)} className="px-3 py-2 border rounded-lg text-sm hover:bg-muted">Cancel</button>
          </div>
        ) : (
          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {po.expectedDeliveryDate
              ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Not set'}
            {isOverdue && ' (overdue)'}
          </p>
        )}
      </div>

      {/* Lines */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Materials ordered</h2>
          <span className="text-sm font-mono font-medium">EGP {total.toFixed(2)}</span>
        </div>
        <div className="divide-y">
          {po.lines.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{l.material.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{l.material.sku}</p>
              </div>
              <div className="text-right text-sm font-mono shrink-0">
                <p>{Number(l.quantityOrdered).toFixed(3)} {UOM[l.material.unit] ?? l.material.unit}</p>
                <p className="text-xs text-muted-foreground">@ EGP {Number(l.unitCost).toFixed(4)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GR status */}
      {po.goodsReceipts.length > 0 && (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b"><h2 className="text-sm font-semibold">Delivery status</h2></div>
          <div className="divide-y">
            {po.goodsReceipts.map((gr) => (
              <div key={gr.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {gr.status === 'CONFIRMED'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <div className="w-4 h-4 rounded-full border-2 border-amber-400" />}
                  <span className="text-sm capitalize">{gr.status.toLowerCase()}</span>
                </div>
                {gr.confirmedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(gr.confirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {po.notes && (
        <div className="bg-white border rounded-2xl px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes from Swappa</p>
          <p className="text-sm">{po.notes}</p>
        </div>
      )}
    </div>
  )
}
