'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, Loader2, ChevronRight } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { useAuth } from '../../../context/auth-context'

interface ReturnSummary {
  id: string
  returnNumber: string
  type: string
  reason: string
  status: string
  isInWarranty: boolean | null
  createdAt: string
  order: { orderNumber: string }
  items: { id: string; quantity: number; orderItem: { snapshotName: string } }[]
  refund: { method: string; amount: string; storeCreditCode: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  RECEIVED: 'Received',
  INSPECTED: 'Being processed',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-50 text-yellow-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  INSPECTED: 'bg-purple-50 text-purple-700',
  RESOLVED: 'bg-emerald-50 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const TYPE_LABELS: Record<string, string> = {
  FULL_RETURN: 'Full return',
  SIZE_EXCHANGE: 'Size exchange',
  HEEL_STYLE_EXCHANGE: 'Style exchange',
  WARRANTY_CLAIM: 'Warranty claim',
}

export default function ReturnsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [returns, setReturns] = useState<ReturnSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    get<ReturnSummary[]>('/returns/mine')
      .then(setReturns)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Returns</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track your return requests and exchange statuses.
        </p>
      </div>

      <div className="mb-4">
        <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
          ← Back to orders
        </Link>
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-16">
          <RotateCcw className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No returns yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            If you need to return an item, please contact us or visit your nearest Swappa location.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div key={ret.id} className="border rounded-2xl p-5 bg-white">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{ret.returnNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ret.status] ?? 'bg-muted text-foreground'}`}>
                      {STATUS_LABELS[ret.status] ?? ret.status}
                    </span>
                    {ret.isInWarranty && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                        Warranty
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {TYPE_LABELS[ret.type] ?? ret.type} · Order {ret.order.orderNumber}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(ret.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-1 mb-3">
                {ret.items.map((item) => (
                  <p key={item.id} className="text-sm text-muted-foreground">
                    · {item.orderItem.snapshotName} × {item.quantity}
                  </p>
                ))}
              </div>

              {ret.refund && (
                <div className="pt-3 border-t">
                  {ret.refund.method === 'STRIPE' ? (
                    <p className="text-sm text-emerald-600 font-medium">
                      Refund of EGP {Number(ret.refund.amount).toLocaleString()} processed
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">Store credit issued</p>
                      {ret.refund.storeCreditCode && (
                        <p className="text-xs font-mono font-semibold text-emerald-700 mt-0.5">
                          Code: {ret.refund.storeCreditCode}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {ret.status === 'RESOLVED' && !ret.refund && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-blue-600 font-medium">Replacement order dispatched</p>
                </div>
              )}

              {['REQUESTED', 'RECEIVED'].includes(ret.status) && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {ret.status === 'REQUESTED'
                      ? 'Waiting for item to arrive at our warehouse.'
                      : 'Item received — inspection in progress.'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
