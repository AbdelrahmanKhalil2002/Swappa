'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

interface HeelMedia { url: string; alt: string | null }
interface HeelStyle {
  id: string
  name: string
  slug: string
  type: string
  heightCm: number
  addedPrice: string
  layerImageUrl: string | null
  media: HeelMedia[]
}

interface Props {
  baseShoeImage: string | null
  baseShoeAlt: string
  basePrice: number
  heels: HeelStyle[]
}

export function HeelConfigurator({ baseShoeImage, baseShoeAlt, basePrice, heels }: Props) {
  const [selected, setSelected] = useState<HeelStyle | null>(null)

  const totalPrice = basePrice + (selected ? Number(selected.addedPrice) : 0)
  const heelThumb = selected?.media[0]?.url ?? null

  return (
    <section className="mt-16 pt-12 border-t">
      <h2 className="font-display text-2xl font-light mb-2">Configure your heel</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Select a compatible heel style. The price updates automatically.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Preview */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden">
            {/* Base shoe */}
            {baseShoeImage ? (
              <Image
                src={baseShoeImage}
                alt={baseShoeAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted-foreground/30 text-sm">No image</span>
              </div>
            )}

            {/* Heel overlay layer — only shown if layerImageUrl is set */}
            {selected?.layerImageUrl && (
              <div className="absolute inset-0">
                <Image
                  src={selected.layerImageUrl}
                  alt={selected.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>
            )}

            {/* Selected heel badge */}
            {selected && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  {heelThumb && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image src={heelThumb} alt={selected.name} width={32} height={32} className="object-cover w-full h-full" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white font-medium leading-none">{selected.name}</p>
                    <p className="text-[10px] text-white/60 mt-0.5">
                      {selected.type.charAt(0) + selected.type.slice(1).toLowerCase()} · {selected.heightCm} cm
                    </p>
                  </div>
                </div>
                <p className="text-sm text-white font-semibold">
                  EGP {totalPrice.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {!selected && (
            <p className="text-center text-xs text-muted-foreground">
              Select a heel style to preview the combination
            </p>
          )}
        </div>

        {/* Heel picker */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
            Compatible heel styles ({heels.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {heels.map((heel) => {
              const isSelected = selected?.id === heel.id
              const thumb = heel.media[0]?.url
              return (
                <button
                  key={heel.id}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : heel)}
                  className={`relative group text-left rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected
                      ? 'border-foreground shadow-md'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="relative aspect-square bg-muted">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={heel.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="160px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-muted-foreground/30 text-xs">No image</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle2 className="w-5 h-5 text-white drop-shadow" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium leading-snug truncate">{heel.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {heel.type.charAt(0) + heel.type.slice(1).toLowerCase()} · {heel.heightCm} cm
                    </p>
                    {Number(heel.addedPrice) > 0 && (
                      <p className="text-[10px] text-foreground font-medium mt-0.5">
                        +EGP {Number(heel.addedPrice).toLocaleString()}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
