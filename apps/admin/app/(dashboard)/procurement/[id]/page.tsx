'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Package } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
type GRStatus = 'PENDING' | 'RECONCILED' | 'CONFIRMED'

interface POLine {
  id: string; materialId: string; quantityOrdered: string; unitCost: string
  material: { id: string; name: string; sku: string; unit: string }
}
interface GRLine {
  id: string; purchaseOrderLineId: string; materialId: string
  quantityExpected: string; quantityReceived: string; unitCost: string
  hasShortage: boolean; shortageNotes: string | null
  material: { id: string; name: string; sku: string; unit: string }
}
interface GoodsReceipt {
  id: string; status: GRStatus; notes: string | null; confirmedAt: string | null; lines: GRLine[]
}
interface PurchaseOrder {
  id: string; orderNumber: string; status: POStatus; notes: string | null
  expectedDeliveryDate: string | null; createdAt: string
  supplier: { id: string; name: string; code: string; contactEmail: string }
  lines: POLine[]
  goodsReceipts: GoodsReceipt[]
}

const STATUS_STYLES: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700', PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-gray-100 text-gray-400',
}
const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', CONFIRMED: 'Confirmed',
  PARTIALLY_RECEIVED: 'Partially Received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
}
const UOM: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }
const STATUSES_FLOW: POStatus[] = ['DRAFT', 'SENT', 'CONFIRMED']

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // GR reconcile state
  const [grLines, setGrLines] = useState<Record<string, { qty: string; notes: string }>>({})

  async function load() {
    try {
      const data = await get<PurchaseOrder>(`/procurement/orders/${id}`)
      setPo(data)
    } catch { /* noop */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function updateStatus(status: POStatus) {
    setSaving(true); setError('')
    try { await patch(`/procurement/orders/${id}/status`, { status }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function createGR() {
    setSaving(true); setError('')
    try {
      const gr = await post<GoodsReceipt>(`/procurement/orders/${id}/receipt`, {})
      // Pre-populate reconcile form with expected qtys
      const init: Record<string, { qty: string; notes: string }> = {}
      for (const l of gr.lines) {
        init[l.purchaseOrderLineId] = { qty: String(Number(l.quantityExpected)), notes: '' }
      }
      setGrLines(init)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function reconcileGR(grId: string) {
    setSaving(true); setError('')
    const gr = po!.goodsReceipts.find((g) => g.id === grId)!
    try {
      await patch(`/procurement/orders/${id}/receipt/${grId}/reconcile`, {
        lines: gr.lines.map((l) => {
          const entry = grLines[l.purchaseOrderLineId] ?? { qty: '0', notes: '' }
          const received = parseFloat(entry.qty) || 0
          const expected = Number(l.quantityExpected)
          return {
            purchaseOrderLineId: l.purchaseOrderLineId,
            quantityReceived: received,
            hasShortage: received < expected,
            shortageNotes: entry.notes || undefined,
          }
        }),
      })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function confirmGR(grId: string) {
    if (!confirm('Confirm receipt? This will update raw material stock.')) return
    setSaving(true); setError('')
    try { await patch(`/procurement/orders/${id}/receipt/${grId}/confirm`, {}); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 flex items-center justify-center min-h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (!po) return null

  const total = po.lines.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitCost), 0)
  const pendingGR = po.goodsReceipts.find((g) => g.status !== 'CONFIRMED')
  const canReceive = po.status !== 'CANCELLED' && po.status !== 'RECEIVED' && !pendingGR

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/procurement" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Purchase Orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold font-mono">{po.orderNumber}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[po.status]}`}>
              {STATUS_LABELS[po.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/suppliers/${po.supplier.id}`} className="hover:underline">{po.supplier.name}</Link>
            {' · '}{po.supplier.contactEmail}
          </p>
        </div>
        {/* Status controls */}
        {po.status !== 'CANCELLED' && po.status !== 'RECEIVED' && (
          <div className="flex items-center gap-2">
            {STATUSES_FLOW.map((s, i) => {
              const current = STATUSES_FLOW.indexOf(po.status)
              if (i <= current) return null
              return (
                <button key={s} onClick={() => updateStatus(s)} disabled={saving}
                  className="px-3 py-1.5 border text-sm font-medium rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
                  Mark {STATUS_LABELS[s]}
                </button>
              )
            })}
            <button onClick={() => updateStatus('CANCELLED')} disabled={saving}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <div className="border rounded-xl divide-y text-sm">
            {[
              ['Expected delivery', po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
              ['Created', new Date(po.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
              ['Total value', `EGP ${total.toFixed(2)}`],
              ['Notes', po.notes ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex px-4 py-3 gap-4">
                <p className="w-36 text-muted-foreground shrink-0">{label}</p>
                <p>{value}</p>
              </div>
            ))}
          </div>

          {/* PO Lines */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h2 className="text-sm font-semibold">Material lines</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Material</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Unit cost</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {po.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p>{l.material.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{l.material.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {Number(l.quantityOrdered).toFixed(3)} {UOM[l.material.unit] ?? l.material.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">EGP {Number(l.unitCost).toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      EGP {(Number(l.quantityOrdered) * Number(l.unitCost)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Receive button */}
          {canReceive && (
            <button onClick={createGR} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors">
              <Package className="w-4 h-4" /> Start goods receipt
            </button>
          )}

          {/* Pending GR — reconcile */}
          {pendingGR && pendingGR.status === 'PENDING' && (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-amber-50 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-800">Goods receipt — enter quantities received</h2>
              </div>
              <div className="divide-y">
                {pendingGR.lines.map((l) => (
                  <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{l.material.name}</p>
                      <p className="text-xs text-muted-foreground">Expected: {Number(l.quantityExpected).toFixed(3)} {UOM[l.material.unit] ?? ''}</p>
                    </div>
                    <input type="number" min="0" step="any"
                      value={grLines[l.purchaseOrderLineId]?.qty ?? String(Number(l.quantityExpected))}
                      onChange={(e) => setGrLines((prev) => ({ ...prev, [l.purchaseOrderLineId]: { ...prev[l.purchaseOrderLineId], qty: e.target.value } }))}
                      className="w-28 px-3 py-2 border rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-accent/40" />
                    <input value={grLines[l.purchaseOrderLineId]?.notes ?? ''}
                      onChange={(e) => setGrLines((prev) => ({ ...prev, [l.purchaseOrderLineId]: { ...prev[l.purchaseOrderLineId], notes: e.target.value } }))}
                      placeholder="Shortage notes"
                      className="w-40 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t bg-muted/20">
                <button onClick={() => reconcileGR(pendingGR.id)} disabled={saving}
                  className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors">
                  Reconcile
                </button>
              </div>
            </div>
          )}

          {/* Reconciled GR — confirm */}
          {pendingGR && pendingGR.status === 'RECONCILED' && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-amber-800">Reconciled — review & confirm</h2>
                </div>
                <button onClick={() => confirmGR(pendingGR.id)} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & update stock
                </button>
              </div>
              <div className="divide-y">
                {pendingGR.lines.map((l) => (
                  <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{l.material.name}</p>
                      {l.shortageNotes && <p className="text-xs text-amber-700">{l.shortageNotes}</p>}
                    </div>
                    <div className="text-right text-xs font-mono">
                      <p className={l.hasShortage ? 'text-red-600' : 'text-emerald-600'}>
                        {Number(l.quantityReceived).toFixed(3)} / {Number(l.quantityExpected).toFixed(3)} {UOM[l.material.unit] ?? ''}
                      </p>
                      {l.hasShortage && <p className="text-red-500">Shortage</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirmed GRs sidebar */}
        <div className="space-y-3">
          {po.goodsReceipts.filter((g) => g.status === 'CONFIRMED').map((gr) => (
            <div key={gr.id} className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-emerald-50 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-800">Receipt confirmed</h3>
              </div>
              <div className="divide-y">
                {gr.lines.map((l) => (
                  <div key={l.id} className="px-4 py-2.5 text-xs">
                    <p className="font-medium">{l.material.name}</p>
                    <p className="text-muted-foreground font-mono">{Number(l.quantityReceived).toFixed(3)} {UOM[l.material.unit] ?? ''}</p>
                    {l.hasShortage && <p className="text-amber-600">Shortage noted</p>}
                  </div>
                ))}
              </div>
              {gr.confirmedAt && (
                <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
                  {new Date(gr.confirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
