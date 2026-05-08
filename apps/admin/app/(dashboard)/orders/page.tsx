'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { get } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'
import { EmptyState } from '../../../components/ui/empty-state'

interface OrderRow {
  id: string
  orderNumber: string
  createdAt: string
  email: string
  firstName: string
  lastName: string
  status: string
  paymentStatus: string
  total: string
  _count: { items: number }
}

interface PageData {
  items: OrderRow[]
  total: number
  page: number
  pages: number
}

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-purple-50 text-purple-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600',
  PAID: 'text-emerald-600',
  FAILED: 'text-red-500',
  REFUNDED: 'text-muted-foreground',
}

export default function OrdersPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: number, q: string, s: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '30' })
      if (q) params.set('search', q)
      if (s) params.set('status', s)
      const res = await get<PageData>(`/orders?${params}`)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, search, status) }, [page, search, status, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, search, status)
  }

  function handleStatus(s: string) {
    setStatus(s)
    setPage(1)
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Orders"
        description="View and manage customer orders."
      />

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, name, email…"
            className="pl-8 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 w-64"
          />
        </form>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === '' ? 'bg-foreground text-background' : 'border hover:bg-muted'}`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-foreground text-background' : 'border hover:bg-muted'}`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No orders found" description="Orders will appear here once customers check out." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium font-mono text-xs">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.firstName} {order.lastName}</p>
                      <p className="text-xs text-muted-foreground">{order.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-muted text-foreground'}`}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus] ?? ''}`}>
                      {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      EGP {Number(order.total).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors inline-block"
                        title="View order"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {data.total} orders · page {data.page} of {data.pages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === data.pages}
                    className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
