'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Package, CreditCard, RotateCcw } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'

interface ReturnItem {
  id: string
  quantity: number
  condition: string | null
  notes: string | null
  orderItem: {
    id: string
    snapshotName: string
    snapshotSku: string
    quantity: number
    variant: { id: string; size: string; color: string }
    heelStyle: { name: string } | null
  }
}

interface ReturnDetail {
  id: string
  returnNumber: string
  type: string
  reason: string
  reasonNotes: string | null
  status: string
  isInWarranty: boolean | null
  replacementOrderId: string | null
  createdAt: string
  order: {
    orderNumber: string
    email: string
    firstName: string
    lastName: string
    stripePaymentIntentId: string | null
    total: string
    createdAt: string
  }
  items: ReturnItem[]
  inspection: {
    id: string
    notes: string | null
    inspectedAt: string
    inspectedBy: { firstName: string | null; lastName: string | null }
  } | null
  refund: {
    method: string
    amount: string
    stripeRefundId: string | null
    storeCreditCode: string | null
    processedAt: string
    processedBy: { firstName: string | null; lastName: string | null }
  } | null
  createdBy: { firstName: string | null; lastName: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-50 text-yellow-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  INSPECTED: 'bg-purple-50 text-purple-700',
  RESOLVED: 'bg-emerald-50 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const CONDITIONS = ['RESALABLE', 'NEEDS_REWORK', 'SCRAP']

const CONDITION_COLORS: Record<string, string> = {
  RESALABLE: 'text-emerald-600',
  NEEDS_REWORK: 'text-amber-600',
  SCRAP: 'text-red-500',
}

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ret, setRet] = useState<ReturnDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  // Inspection state
  const [showInspectForm, setShowInspectForm] = useState(false)
  const [itemConditions, setItemConditions] = useState<Record<string, { condition: string; notes: string }>>({})
  const [inspectNotes, setInspectNotes] = useState('')

  // Refund state
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundMethod, setRefundMethod] = useState('STRIPE')
  const [refundAmount, setRefundAmount] = useState('')

  async function load() {
    try {
      const data = await get<ReturnDetail>(`/returns/${id}`)
      setRet(data)
      const initial: Record<string, { condition: string; notes: string }> = {}
      for (const item of data.items) {
        initial[item.id] = { condition: item.condition ?? 'RESALABLE', notes: item.notes ?? '' }
      }
      setItemConditions(initial)
      setRefundAmount(Number(data.order.total).toFixed(2))
    } catch { /* noop */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleMarkReceived() {
    setActionLoading(true); setError('')
    try {
      const updated = await patch<ReturnDetail>(`/returns/${id}/receive`, {})
      setRet(updated)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setActionLoading(false) }
  }

  async function handleInspect(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true); setError('')
    try {
      const items = Object.entries(itemConditions).map(([returnItemId, v]) => ({
        returnItemId,
        condition: v.condition,
        notes: v.notes || undefined,
      }))
      const updated = await post<ReturnDetail>(`/returns/${id}/inspect`, { items, notes: inspectNotes || undefined })
      setRet(updated)
      setShowInspectForm(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setActionLoading(false) }
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true); setError('')
    try {
      const updated = await post<ReturnDetail>(`/returns/${id}/refund`, {
        method: refundMethod,
        amount: parseFloat(refundAmount),
      })
      setRet(updated)
      setShowRefundForm(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setActionLoading(false) }
  }

  async function handleExchange() {
    if (!confirm('Create a replacement order for this exchange?')) return
    setActionLoading(true); setError('')
    try {
      const data = await post<{ return: ReturnDetail }>(`/returns/${id}/exchange`, {})
      setRet(data.return)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setActionLoading(false) }
  }

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  )
  if (!ret) return null

  const isExchange = ret.type === 'SIZE_EXCHANGE' || ret.type === 'HEEL_STYLE_EXCHANGE'

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/returns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Returns
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <PageHeader
            title={ret.returnNumber}
            description={`${ret.type.replace(/_/g, ' ')} · ${ret.reason.replace(/_/g, ' ')}`}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[ret.status] ?? 'bg-muted text-foreground'}`}>
              {ret.status}
            </span>
            {ret.isInWarranty && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">In warranty</span>
            )}
          </div>
        </div>
        <Link href={`/orders/${ret.order.orderNumber}`} className="text-xs text-accent hover:underline font-mono">
          {ret.order.orderNumber}
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + inspection + refund */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="border rounded-xl overflow-hidden bg-surface">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h2 className="text-sm font-semibold">Return items ({ret.items.length})</h2>
            </div>
            <div className="divide-y">
              {ret.items.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.orderItem.snapshotName}</p>
                    <p className="text-xs text-muted-foreground">
                      Size {item.orderItem.variant.size}
                      {item.orderItem.heelStyle ? ` · + ${item.orderItem.heelStyle.name}` : ''}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">{item.orderItem.snapshotSku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    {item.condition && (
                      <p className={`text-xs font-medium ${CONDITION_COLORS[item.condition] ?? ''}`}>
                        {item.condition}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection */}
          {ret.inspection ? (
            <div className="border rounded-xl p-5 bg-surface">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold">Inspected</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                By {ret.inspection.inspectedBy.firstName} {ret.inspection.inspectedBy.lastName} ·{' '}
                {new Date(ret.inspection.inspectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {ret.inspection.notes && <p className="text-sm mt-2">{ret.inspection.notes}</p>}
            </div>
          ) : ret.status === 'RECEIVED' && (
            <div className="border rounded-xl overflow-hidden bg-surface">
              <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Inspection</h2>
                <button onClick={() => setShowInspectForm(!showInspectForm)}
                  className="text-xs text-accent hover:underline">
                  {showInspectForm ? 'Cancel' : 'Begin inspection'}
                </button>
              </div>
              {showInspectForm && (
                <form onSubmit={handleInspect} className="p-5 space-y-4">
                  {ret.items.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <p className="text-sm font-medium">{item.orderItem.snapshotName} × {item.quantity}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Condition</label>
                          <select
                            value={itemConditions[item.id]?.condition ?? 'RESALABLE'}
                            onChange={(e) => setItemConditions((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], condition: e.target.value },
                            }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none">
                            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                          <input
                            value={itemConditions[item.id]?.notes ?? ''}
                            onChange={(e) => setItemConditions((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], notes: e.target.value },
                            }))}
                            placeholder="Optional"
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Overall inspection notes</label>
                    <textarea value={inspectNotes} onChange={(e) => setInspectNotes(e.target.value)} rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none" />
                  </div>
                  <button type="submit" disabled={actionLoading}
                    className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit inspection
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Resolution */}
          {ret.status === 'INSPECTED' && !ret.refund && !ret.replacementOrderId && (
            <div className="border rounded-xl overflow-hidden bg-surface">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">Resolution</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setShowRefundForm(true) }}
                    className="flex items-center gap-1.5 px-4 py-2 border text-sm font-medium rounded-lg hover:bg-muted">
                    <CreditCard className="w-4 h-4" /> Issue refund
                  </button>
                  {isExchange && (
                    <button onClick={handleExchange} disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 border text-sm font-medium rounded-lg hover:bg-muted disabled:opacity-50">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Create replacement order
                    </button>
                  )}
                </div>

                {showRefundForm && (
                  <form onSubmit={handleRefund} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                    <p className="text-xs font-semibold">Issue refund</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Method</label>
                        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white focus:outline-none">
                          <option value="STRIPE">Stripe refund</option>
                          <option value="STORE_CREDIT">Store credit</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Amount (EGP)</label>
                        <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required
                          className="w-full px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none" />
                      </div>
                    </div>
                    {refundMethod === 'STRIPE' && !ret.order.stripePaymentIntentId && (
                      <p className="text-xs text-amber-600">No Stripe payment on this order. Use store credit instead.</p>
                    )}
                    <div className="flex gap-2">
                      <button type="submit" disabled={actionLoading}
                        className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                        {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Process {refundMethod === 'STRIPE' ? 'refund' : 'store credit'}
                      </button>
                      <button type="button" onClick={() => setShowRefundForm(false)}
                        className="px-4 py-2 border text-sm rounded-lg hover:bg-muted">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Refund result */}
          {ret.refund && (
            <div className="border rounded-xl p-5 bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-emerald-800">
                  {ret.refund.method === 'STRIPE' ? 'Stripe refund processed' : 'Store credit issued'}
                </h2>
              </div>
              <p className="text-sm font-semibold">EGP {Number(ret.refund.amount).toLocaleString()}</p>
              {ret.refund.stripeRefundId && (
                <p className="text-xs text-muted-foreground font-mono mt-1">{ret.refund.stripeRefundId}</p>
              )}
              {ret.refund.storeCreditCode && (
                <p className="text-xs font-mono font-semibold text-emerald-700 mt-1">{ret.refund.storeCreditCode}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                By {ret.refund.processedBy.firstName} {ret.refund.processedBy.lastName} ·{' '}
                {new Date(ret.refund.processedAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          )}

          {/* Replacement order */}
          {ret.replacementOrderId && (
            <div className="border rounded-xl p-5 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-800">Replacement order created</h2>
              </div>
              <Link href={`/orders`} className="text-xs text-blue-600 underline font-mono">
                {ret.replacementOrderId}
              </Link>
            </div>
          )}
        </div>

        {/* Right: actions + info */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="border rounded-xl p-5 bg-surface space-y-3">
            <h2 className="text-sm font-semibold">Actions</h2>
            {ret.status === 'REQUESTED' && (
              <button onClick={handleMarkReceived} disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Mark as received
              </button>
            )}
            {ret.status === 'RECEIVED' && !ret.inspection && (
              <button onClick={() => setShowInspectForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border text-sm font-medium rounded-lg hover:bg-muted">
                <RotateCcw className="w-4 h-4" /> Begin inspection
              </button>
            )}
            {['RESOLVED', 'INSPECTED'].includes(ret.status) === false && ret.status !== 'REQUESTED' && ret.status !== 'RECEIVED' && (
              <p className="text-xs text-muted-foreground text-center">No actions available</p>
            )}
            {(ret.status === 'RESOLVED' || ret.status === 'CLOSED') && (
              <p className="text-xs text-emerald-600 text-center font-medium">Return resolved</p>
            )}
          </div>

          {/* Order info */}
          <div className="border rounded-xl p-5 bg-surface text-sm space-y-1">
            <h2 className="font-semibold mb-2">Customer</h2>
            <p>{ret.order.firstName} {ret.order.lastName}</p>
            <p className="text-muted-foreground">{ret.order.email}</p>
            <div className="pt-2 border-t mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>Order total: <span className="font-medium text-foreground">EGP {Number(ret.order.total).toLocaleString()}</span></p>
              <p>Order placed: {new Date(ret.order.createdAt).toLocaleDateString('en-GB')}</p>
              {ret.order.stripePaymentIntentId
                ? <p className="font-mono break-all">{ret.order.stripePaymentIntentId}</p>
                : <p className="italic">No payment intent</p>}
            </div>
          </div>

          {/* Meta */}
          <div className="border rounded-xl p-5 bg-surface text-xs text-muted-foreground space-y-1">
            <p>Created: {new Date(ret.createdAt).toLocaleDateString('en-GB')}</p>
            <p>By: {ret.createdBy.firstName} {ret.createdBy.lastName}</p>
            {ret.reasonNotes && <p className="italic pt-1 border-t mt-1">&ldquo;{ret.reasonNotes}&rdquo;</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
