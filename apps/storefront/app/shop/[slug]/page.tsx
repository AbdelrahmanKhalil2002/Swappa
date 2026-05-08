import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import { Viewer360 } from '../../../components/shop/viewer-360'
import { HeelConfigurator } from '../../../components/shop/heel-configurator'
import { SizeProfilePrompt } from '../../../components/shop/size-profile-prompt'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Media { url: string; alt: string | null; position: number; type: 'GALLERY' | 'FRAME_360' }
interface Variant { id: string; size: string; color: string; sku: string; stock: number }
interface CompatibleHeel {
  heelStyleId: string
  heelStyle: {
    id: string; name: string; slug: string; type: string; heightCm: number
    addedPrice: string; layerImageUrl: string | null
    media: Media[]
  }
}

interface Shoe {
  id: string; slug: string; name: string; description: string | null
  basePrice: string; status: string
  category: { name: string; slug: string } | null
  seoTitle: string | null; seoDescription: string | null
  media: Media[]
  variants: Variant[]
  compatibility: CompatibleHeel[]
}

async function fetchShoe(slug: string): Promise<Shoe | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/shoes/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const shoe = await fetchShoe(slug)
  if (!shoe) return { title: 'Not found' }
  return {
    title: shoe.seoTitle ?? shoe.name,
    description: shoe.seoDescription ?? shoe.description ?? undefined,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const shoe = await fetchShoe(slug)
  if (!shoe || shoe.status !== 'ACTIVE') notFound()

  const galleryImages = shoe.media.filter((m) => m.type === 'GALLERY')
  const frames360 = shoe.media.filter((m) => m.type === 'FRAME_360').sort((a, b) => a.position - b.position)
  const compatibleHeels = shoe.compatibility.filter((c) => c.heelStyle).map((c) => c.heelStyle)
  const sizes = [...new Set(shoe.variants.map((v) => v.size))].sort()
  const colors = [...new Set(shoe.variants.map((v) => v.color))]

  const coverImage = galleryImages[0]

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            {shoe.category && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>{shoe.category.name}</span>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{shoe.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Left: 360 viewer if frames exist, else gallery */}
          <div className="space-y-3">
            {frames360.length >= 3 ? (
              <Viewer360 frames={frames360} />
            ) : (
              <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden">
                {coverImage ? (
                  <Image
                    src={coverImage.url}
                    alt={coverImage.alt ?? shoe.name}
                    fill priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-muted-foreground/30 text-sm">No image</span>
                  </div>
                )}
              </div>
            )}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.slice(1, 5).map((m, i) => (
                  <div key={i} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <Image src={m.url} alt={m.alt ?? ''} fill className="object-cover" sizes="80px" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="lg:pt-2">
            {shoe.category && (
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{shoe.category.name}</p>
            )}
            <h1 className="font-display text-4xl font-light leading-tight">{shoe.name}</h1>
            <p className="mt-3 text-2xl font-light">EGP {Number(shoe.basePrice).toLocaleString()}</p>

            {shoe.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{shoe.description}</p>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} className="px-3 py-1.5 border rounded-lg text-sm hover:border-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
                <SizeProfilePrompt availableSizes={sizes} />
              </div>
            )}

            {/* Colors */}
            {colors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2">Colour</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button key={c} className="px-3 py-1.5 border rounded-lg text-sm hover:border-foreground transition-colors">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button disabled className="mt-8 w-full py-3.5 bg-foreground text-background font-medium rounded-xl opacity-50 cursor-not-allowed">
              Add to cart — available soon
            </button>

            {compatibleHeels.length > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Compatible with {compatibleHeels.length} heel style{compatibleHeels.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Heel Care link */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              New to swappable heels?{' '}
              <Link href="/heel-care" className="underline hover:text-foreground transition-colors">
                Read the Heel Care Guide →
              </Link>
            </p>
          </div>
        </div>

        {/* Heel Configurator */}
        {compatibleHeels.length > 0 && (
          <HeelConfigurator
            baseShoeImage={coverImage?.url ?? null}
            baseShoeAlt={shoe.name}
            basePrice={Number(shoe.basePrice)}
            heels={compatibleHeels}
          />
        )}
      </div>
    </div>
  )
}
