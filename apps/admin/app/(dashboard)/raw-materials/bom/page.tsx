'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { get } from '../../../../lib/api-client'
import { PageHeader } from '../../../../components/ui/page-header'
import { EmptyState } from '../../../../components/ui/empty-state'

interface BOMSummary {
  id: string
  variantId: string
  updatedAt: string
  variant: {
    size: string
    color: string
    sku: string
    baseShoe: { id: string; name: string }
  }
  lines: { id: string; quantityPerUnit: string; material: { name: string; unit: string; costPerUnit: string } }[]
}

interface PageData { items: BOMSummary[]; total: number; page: number; pages: number }

const UOM_LABELS: Record<string, string> = { UNITS: 'units', METERS: 'm', SQM: 'm²', KG: 'kg', GRAMS: 'g', LITERS: 'L', ML: 'mL' }

export default function BomListPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    get<PageData>(`/raw-materials/bom/all?page=${page}&limit=30`)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="p-8">
      <Link href="/raw-materials" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Raw Materials
      </Link>

      <PageHeader
        title="Bills of Materials"
        description="Define which raw materials are needed to produce each product variant."
      />

      <div className="mt-6 bg-surface border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No BOMs yet"
            description="Open a variant's BOM editor to define its material requirements."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Materials</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Material cost/unit</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Last updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((bom) => {
                  const materialCost = bom.lines.reduce(
                    (sum, l) => sum + Number(l.quantityPerUnit) * Number(l.material.costPerUnit),
                    0,
                  )
                  return (
                    <tr key={bom.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{bom.variant.baseShoe.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Size {bom.variant.size} · {bom.variant.color} · <span className="font-mono">{bom.variant.sku}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {bom.lines.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No lines</span>
                        ) : (
                          <div className="space-y-0.5">
                            {bom.lines.slice(0, 3).map((l) => (
                              <p key={l.id} className="text-xs text-muted-foreground">
                                {Number(l.quantityPerUnit).toFixed(3)} {UOM_LABELS[l.material.unit]} {l.material.name}
                              </p>
                            ))}
                            {bom.lines.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{bom.lines.length - 3} more</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {materialCost > 0 ? `EGP ${materialCost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {new Date(bom.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/raw-materials/bom/${bom.variantId}`}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors inline-block"
                          title="Edit BOM"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">{data.total} BOMs · page {data.page} of {data.pages}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page === data.pages} className="p-1.5 hover:bg-muted rounded-md disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
