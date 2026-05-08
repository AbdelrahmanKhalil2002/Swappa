'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Category {
  id: string
  name: string
  slug: string
}

interface ShopFiltersProps {
  categories: Category[]
}

const HEEL_TYPES = [
  { value: '', label: 'All types' },
  { value: 'STILETTO', label: 'Stiletto' },
  { value: 'BLOCK', label: 'Block' },
  { value: 'WEDGE', label: 'Wedge' },
  { value: 'KITTEN', label: 'Kitten' },
  { value: 'CONE', label: 'Cone' },
  { value: 'FLAT', label: 'Flat' },
]

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export function ShopFilters({ categories }: ShopFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const current = (key: string) => searchParams.get(key) ?? ''

  return (
    <aside className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sort</p>
        <select
          value={current('sort')}
          onChange={(e) => update('sort', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
        <div className="space-y-1">
          <button
            onClick={() => update('category', '')}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
              !current('category') ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted'
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => update('category', cat.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                current('category') === cat.id ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Compatible heel type
        </p>
        <div className="space-y-1">
          {HEEL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update('heelType', t.value)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                current('heelType') === t.value ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(current('category') || current('heelType') || current('sort')) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  )
}
