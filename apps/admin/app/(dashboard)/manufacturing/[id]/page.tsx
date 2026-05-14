'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { get, patch } from '../../../../lib/api-client'

type Status =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'QC_PENDING'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'

interface StageLog {
  id: string
  stage: string
  unitsCompleted: number
  notes: string | null
  createdAt: string
  worker: { id: string; name: string } | null
}

interface QCInspection {
  id: string
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  checklistResults: Record<string, boolean>
  defectNotes: string | null
  defectPhotoUrls: string[]
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

interface ProductionOrder {
  id: string
  orderNumber: string
  status: Status
  currentStage: string | null
  quantity: number
  materialCostPerUnit: string
  overheadCostPerUnit: string
  notes: string | null
  createdAt: string
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { name: string }
  }
  stageLogs: StageLog[]
  qcInspections: QCInspection[]
}

const STATUS_STYLES: Record<Status, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  QC_PENDING: 'bg-amber-50 text-amber-700',
  QC_APPROVED: 'bg-emerald-50 text-emerald-700',
  QC_REJECTED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<Status, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  QC_PENDING: 'QC Pending',
  QC_APPROVED: 'QC Approved',
  QC_REJECTED: 'QC Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // QC review state
  const [rejectionReason, setRejectionReason] = useState('')

  async function load() {
    try {
      const o = await get<ProductionOrder>(`/manufacturing/${id}`)
      setOrder(o)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleQCReview(decision: 'APPROVED' | 'REJECTED') {
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await patch(`/manufacturing/${id}/qc/review`, {
        decision,
        rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
      })
      setRejectionReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this production order?')) return
    setSaving(true)
    setError('')
    try {
      await patch(`/manufacturing/${id}/cancel`, {})
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  if (!order) return null

  const materialCost = Number(order.materialCostPerUnit)
  const overheadCost = Number(order.overheadCostPerUnit)
  const totalCostPerUnit = materialCost + overheadCost
  const totalCost = totalCostPerUnit * order.quantity

  const submittedQC = order.qcInspections.find((q) => q.status === 'SUBMITTED')
  const latestQC = order.qcInspections[0]
  const canCancel = order.status !== 'COMPLETED' && order.status !== 'CANCELLED'

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/manufacturing"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Manufacturing
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold">{order.variant.baseShoe.name}</h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Size {order.variant.size} · {order.variant.color} ·{' '}
            <span className="font-mono">{order.variant.sku}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{order.orderNumber}</p>
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={saving}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            Cancel order
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Cost summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Quantity', value: `${order.quantity} units` },
              { label: 'Material cost/unit', value: materialCost > 0 ? `EGP ${materialCost.toFixed(2)}` : '—' },
              { label: 'Overhead/unit', value: overheadCost > 0 ? `EGP ${overheadCost.toFixed(2)}` : '—' },
              { label: 'Total cost', value: totalCost > 0 ? `EGP ${totalCost.toFixed(2)}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold font-mono">{value}</p>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="border rounded-xl px-4 py-3 text-sm text-muted-foreground">
              {order.notes}
            </div>
          )}

          {/* QC Review panel */}
          {submittedQC && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-amber-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-800">QC inspection awaiting review</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Checklist results */}
                {Object.entries(submittedQC.checklistResults).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Checklist</p>
                    <div className="space-y-1">
                      {Object.entries(submittedQC.checklistResults).map(([item, passed]) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          {passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className={passed ? '' : 'text-red-600'}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submittedQC.defectNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Defect notes</p>
                    <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                      {submittedQC.defectNotes}
                    </p>
                  </div>
                )}

                {/* Review actions */}
                <div className="pt-2 border-t space-y-2">
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required to reject)"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQCReview('APPROVED')}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleQCReview('REJECTED')}
                      disabled={saving || !rejectionReason.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Latest QC result (if not submitted) */}
          {!submittedQC && latestQC && latestQC.status !== 'PENDING' && (
            <div
              className={`border rounded-xl px-5 py-4 ${latestQC.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {latestQC.status === 'APPROVED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <p
                  className={`text-sm font-semibold ${latestQC.status === 'APPROVED' ? 'text-emerald-800' : 'text-red-800'}`}
                >
                  QC {latestQC.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                </p>
              </div>
              {latestQC.rejectionReason && (
                <p className="text-sm text-red-700 mt-1">{latestQC.rejectionReason}</p>
              )}
            </div>
          )}
        </div>

        {/* Stage log timeline */}
        <div className="border rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-semibold">Stage log</h2>
            {order.currentStage && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Current: <span className="font-medium text-foreground">{order.currentStage}</span>
              </p>
            )}
          </div>
          {order.stageLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">
              No stages logged yet.
            </p>
          ) : (
            <div className="divide-y max-h-[480px] overflow-y-auto">
              {order.stageLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{log.stage}</p>
                    <span className="text-xs font-mono text-muted-foreground">
                      {log.unitsCompleted} units
                    </span>
                  </div>
                  {log.worker && (
                    <p className="text-xs text-muted-foreground">{log.worker.name}</p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-muted-foreground">{log.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
