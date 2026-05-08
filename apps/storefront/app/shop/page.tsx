import { Suspense } from 'react'
import { ShopFilters } from '../../components/shop/shop-filters'
import { ProductCard } from '../../components/shop/product-card'
import { Pagination } from '../../components/shop/pagination'
import { SearchBar } from '../../components/shop/search-bar'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Shoe {
  id: string
  slug: string
  name: string
  basePrice: string
  category: { id: string; name: string; slug: string } | null
  media: { url: string; alt: string | null }[]
  _count: { compatibility: number }
}

interface PageData {
  items: Shoe[]
  total: number
  page: number
  pages: number
}

interface Category {
  id: string
  name: string
  slug: string
}

async function fetchProducts(params: Record<string, string>): Promise<PageData> {
  const query = new URLSearchParams({ status: 'ACTIVE', limit: '24', ...params })
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/shoes?${query}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error()
    return res.json()
  } catch {
    return { items: [], total: 0, page: 1, pages: 1 }
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/categories`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error()
    return res.json()
  } catch {
    return []
  }
}

export const metadata = {
  title: 'Shop',
  description: 'Explore our collection of base shoes and interchangeable heel styles.',
}

interface SearchParams {
  category?: string
  heelType?: string
  search?: string
  page?: string
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const query: Record<string, string> = {}
  if (params.category) query.categoryId = params.category
  if (params.heelType) query.heelType = params.heelType
  if (params.search) query.search = params.search
  if (params.page) query.page = params.page

  const [data, categories] = await Promise.all([fetchProducts(query), fetchCategories()])

  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="font-display text-4xl font-light tracking-tight">Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? 'style' : 'styles'} available
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-10">
          {/* Filters sidebar */}
          <div className="hidden lg:block w-52 shrink-0">
            <Suspense>
              <ShopFilters categories={categories} />
            </Suspense>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Suspense>
              <SearchBar defaultValue={params.search ?? ''} />
            </Suspense>

            {data.items.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-6">
                  {data.items.map((shoe) => (
                    <ProductCard
                      key={shoe.id}
                      slug={shoe.slug}
                      name={shoe.name}
                      basePrice={shoe.basePrice}
                      category={shoe.category}
                      media={shoe.media}
                      compatibleHeelCount={shoe._count.compatibility}
                    />
                  ))}
                </div>

                <div className="mt-12">
                  <Suspense>
                    <Pagination page={data.page} pages={data.pages} total={data.total} />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
