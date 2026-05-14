'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import { get, patch, post } from '../../../../lib/api-client'

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
  worker: { name: string } | null
}

interface QCInspection {
  id: string
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
}

interface ProductionOrder {
  id: string
  orderNumber: string
  status: Status
  currentStage: string | null
  quantity: number
  notes: string | null
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { name: string }
  }
  stageLogs: StageLog[]
  qcInspections: QCInspection[]
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

const DEFAULT_CHECKLIST = [
  'No visible defects on upper',
  'Mechanism clicks securely',
  'Sole adhesion is clean',
  'Size label correct',
  'Packaging complete',
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Stage advance form
  const [unitsCompleted, setUnitsCompleted] = useState('')
  const [stageNotes, setStageNotes] = useState('')
  const [showStageForm, setShowStageForm] = useState(false)

  // QC form
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [defectNotes, setDefectNotes] = useState('')
  const [showQCForm, setShowQCForm] = useState(false)

  async function load() {
    try {
      const o = await get<ProductionOrder>(`/manufacturing/factory/orders/${id}`)
      setOrder(o)
      // Initialize checklist
      const initial: Record<string, boolean> = {}
      DEFAULT_CHECKLIST.forEach((item) => { initial[item] = false })
      setChecklist(initial)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleAdvanceStage() {
    if (!order?.currentStage || !unitsCompleted) return
    setSaving(true)
    setError('')
    try {
      await patch(`/manufacturing/factory/orders/${id}/advance`, {
        stage: order.currentStage,
        unitsCompleted: parseInt(unitsCompleted),
        notes: stageNotes || undefined,
      })
      setUnitsCompleted('')
      setStageNotes('')
      setShowStageForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitQC() {
    setSaving(true)
    setError('')
    try {
      await post(`/manufacturing/factory/orders/${id}/qc/submit`, {
        checklistResults: checklist,
        defectNotes: defectNotes || undefined,
      })
      setShowQCForm(false)
      setDefectNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!order) return null

  const pendingQC = order.qcInspections.find((q) => q.status === 'PENDING')
  const latestRejection = order.qcInspections.find((q) => q.status === 'REJECTED')
  const canAdvanceStage =
    (order.status === 'PLANNED' || order.status === 'IN_PROGRESS' || order.status === 'QC_REJECTED') &&
    order.currentStage !== null
  const canSubmitQC =
    (order.status === 'QC_PENDING' || order.status === 'IN_PROGRESS') && !!pendingQC

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold">{order.variant.baseShoe.name}</h1>
            <p className="text-sm text-muted-foreground">
              Size {order.variant.size} · {order.variant.color}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.orderNumber}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-surface border text-muted-foreground">
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 bg-surface border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Qty ordered</p>
            <p className="text-lg font-semibold font-mono">{order.quantity}</p>
          </div>
          <div className="flex-1 bg-surface border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Current stage</p>
            <p className="text-sm font-semibold text-accent">{order.currentStage ?? '—'}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* QC rejection note */}
      {latestRejection?.rejectionReason && order.status === 'QC_REJECTED' && (
        <div className="bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-red-400 mb-1">QC Rejected — action required</p>
          <p className="text-sm text-red-300">{latestRejection.rejectionReason}</p>
        </div>
      )}

      {/* Advance stage */}
      {canAdvanceStage && (
        <div className="bg-surface border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowStageForm(!showStageForm)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="text-left">
              <p className="font-medium">Complete stage</p>
              <p className="text-sm text-accent">{order.currentStage}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${showStageForm ? 'rotate-180' : ''}`}
            />
          </button>

          {showStageForm && (
            <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Units completed
                </label>
                <input
                  type="number"
                  min="1"
                  max={order.quantity}
                  value={unitsCompleted}
                  onChange={(e) => setUnitsCompleted(e.target.value)}
                  placeholder={`Max ${order.quantity}`}
                  className="w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                <textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                  placeholder="Any notes…"
                />
              </div>
              <button
                onClick={handleAdvanceStage}
                disabled={saving || !unitsCompleted}
                className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Mark complete & advance
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submit QC */}
      {canSubmitQC && (
        <div className="bg-surface border border-amber-800/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowQCForm(!showQCForm)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="text-left">
              <p className="font-medium">Submit QC inspection</p>
              <p className="text-sm text-muted-foreground">Complete the quality checklist</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${showQCForm ? 'rotate-180' : ''}`}
            />
          </button>

          {showQCForm && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                {Object.entries(checklist).map(([item, passed]) => (
                  <label
                    key={item}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                    onClick={() =>
                      setChecklist((c) => ({ ...c, [item]: !c[item] }))
                    }
                  >
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        passed
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {passed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Defect notes (if any)
                </label>
                <textarea
                  value={defectNotes}
                  onChange={(e) => setDefectNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                  placeholder="Describe any defects found…"
                />
              </div>

              <button
                onClick={handleSubmitQC}
                disabled={saving}
                className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit QC
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed state */}
      {order.status === 'COMPLETED' && (
        <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-800 rounded-2xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-medium text-emerald-400">Order complete</p>
            <p className="text-sm text-muted-foreground">QC approved. All stages done.</p>
          </div>
        </div>
      )}

      {/* Stage log */}
      {order.stageLogs.length > 0 && (
        <div className="bg-surface border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold">Stage history</h2>
          </div>
          <div className="divide-y">
            {order.stageLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{log.stage}</p>
                  <p className="text-xs font-mono text-muted-foreground">{log.unitsCompleted} units</p>
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(log.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {log.worker && ` · ${log.worker.name}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
