'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import { get, post } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'

interface OrderItem {
  id: string
  snapshotName: string
  snapshotSku: string
  quantity: number
  variant: { size: string; color: string }
  heelStyle: { name: string } | null
}

interface Order {
  id: string
  orderNumber: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
  items: OrderItem[]
}

const RETURN_TYPES = ['FULL_RETURN', 'SIZE_EXCHANGE', 'HEEL_STYLE_EXCHANGE', 'WARRANTY_CLAIM']
const RETURN_REASONS = ['WRONG_SIZE', 'DEFECTIVE_MECHANISM', 'CHANGED_MIND', 'WRONG_ITEM_RECEIVED', 'OTHER']

function NewReturnContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [orderSearch, setOrderSearch] = useState('')
  const [searchResult, setSearchResult] = useState<Order | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedItems, setSelectedItems] = useState<{ id: string; quantity: number }[]>([])
  const [returnType, setReturnType] = useState('FULL_RETURN')
  const [reason, setReason] = useState('WRONG_SIZE')
  const [reasonNotes, setReasonNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const prefilledOrderId = params.get('orderId')

  useEffect(() => {
    if (prefilledOrderId) {
      setSearchLoading(true)
      get<Order>(`/orders/${prefilledOrderId}`)
        .then((o) => {
          setSearchResult(o)
          setSelectedItems(o.items.map((i) => ({ id: i.id, quantity: i.quantity })))
        })
        .catch(() => setSearchError('Order not found'))
        .finally(() => setSearchLoading(false))
    }
  }, [prefilledOrderId])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!orderSearch.trim()) return
    setSearchLoading(true); setSearchError(''); setSearchResult(null); setSelectedItems([])
    try {
      const data = await get<{ items: Order[] }>(`/orders?search=${encodeURIComponent(orderSearch)}&limit=1`)
      if (data.items.length === 0) { setSearchError('No order found'); return }
      const o = data.items[0]
      setSearchResult(o)
      setSelectedItems(o.items.map((i) => ({ id: i.id, quantity: i.quantity })))
    } catch {
      setSearchError('Search failed')
    } finally { setSearchLoading(false) }
  }

  function toggleItem(itemId: string, defaultQty: number) {
    setSelectedItems((prev) => {
      if (prev.find((i) => i.id === itemId)) return prev.filter((i) => i.id !== itemId)
      return [...prev, { id: itemId, quantity: defaultQty }]
    })
  }

  function updateQty(itemId: string, qty: number) {
    setSelectedItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: qty } : i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchResult || selectedItems.length === 0) return
    setSubmitting(true); setError('')
    try {
      const ret = await post<{ id: string }>('/returns', {
        orderId: searchResult.id,
        type: returnType,
        reason,
        reasonNotes: reasonNotes || undefined,
        items: selectedItems.filter((i) => i.quantity > 0),
      })
      router.push(`/returns/${ret.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create return')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/returns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Returns
        </Link>
      </div>

      <PageHeader title="New return" description="Create a return request on behalf of a customer" />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Order search */}
        {!prefilledOrderId && (
          <div className="border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold">Find order</h2>
            <div className="flex gap-2">
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Order number or customer email"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button type="button" onClick={handleSearch} disabled={searchLoading}
                className="px-4 py-2 bg-foreground text-background text-sm rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
            {searchError && <p className="text-sm text-red-500">{searchError}</p>}
          </div>
        )}

        {searchLoading && prefilledOrderId && (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        )}

        {searchResult && (
          <>
            {/* Order summary */}
            <div className="border rounded-xl p-5 bg-muted/20">
              <p className="text-sm font-semibold font-mono">{searchResult.orderNumber}</p>
              <p className="text-sm text-muted-foreground">{searchResult.firstName} {searchResult.lastName} · {searchResult.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Placed {new Date(searchResult.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Select items */}
            <div className="border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">Select items to return</h2>
              </div>
              <div className="divide-y">
                {searchResult.items.map((item) => {
                  const selected = selectedItems.find((i) => i.id === item.id)
                  return (
                    <div key={item.id} className={`px-5 py-3 flex items-center gap-3 transition-colors ${selected ? 'bg-accent/5' : ''}`}>
                      <input type="checkbox" checked={!!selected} onChange={() => toggleItem(item.id, item.quantity)}
                        className="rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.snapshotName}</p>
                        <p className="text-xs text-muted-foreground">
                          Size {item.variant.size} · {item.variant.color}
                          {item.heelStyle ? ` · + ${item.heelStyle.name}` : ''}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">{item.snapshotSku}</p>
                      </div>
                      {selected && (
                        <div className="shrink-0">
                          <label className="text-xs text-muted-foreground mr-1">Qty</label>
                          <input type="number" min={1} max={item.quantity} value={selected.quantity}
                            onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-accent/40" />
                          <span className="text-xs text-muted-foreground ml-1">/ {item.quantity}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Return type + reason */}
            <div className="border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold">Return details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Return type</label>
                  <select value={returnType} onChange={(e) => setReturnType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40">
                    {RETURN_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Reason</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40">
                    {RETURN_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Additional notes</label>
                <textarea value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} rows={2}
                  placeholder="Optional details from the customer"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting || selectedItems.length === 0}
                className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create return
              </button>
              <Link href="/returns" className="px-5 py-2.5 border text-sm font-medium rounded-xl hover:bg-muted">
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

export default function NewReturnPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
      <NewReturnContent />
    </Suspense>
  )
}
