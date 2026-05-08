import Link from 'next/link'
import Image from 'next/image'

interface ProductCardProps {
  slug: string
  name: string
  basePrice: string
  category: { name: string } | null
  media: { url: string; alt: string | null }[]
  compatibleHeelCount: number
}

export function ProductCard({ slug, name, basePrice, category, media, compatibleHeelCount }: ProductCardProps) {
  const image = media[0]

  return (
    <Link href={`/shop/${slug}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden mb-3">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground/30 text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-0.5">
        {category && (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{category.name}</p>
        )}
        <p className="font-display text-base font-medium leading-snug group-hover:text-accent transition-colors">
          {name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">EGP {Number(basePrice).toLocaleString()}</p>
          {compatibleHeelCount > 0 && (
            <p className="text-xs text-muted-foreground">{compatibleHeelCount} heel styles</p>
          )}
        </div>
      </div>
    </Link>
  )
}
