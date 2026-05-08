'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Ruler } from 'lucide-react'

// EU shoe size chart (foot length in mm → EU size)
const EU_CHART: { min: number; max: number; eu: string }[] = [
  { min: 218, max: 224, eu: '35' },
  { min: 225, max: 231, eu: '36' },
  { min: 232, max: 238, eu: '37' },
  { min: 239, max: 245, eu: '38' },
  { min: 246, max: 252, eu: '39' },
  { min: 253, max: 259, eu: '40' },
  { min: 260, max: 266, eu: '41' },
  { min: 267, max: 273, eu: '42' },
  { min: 274, max: 280, eu: '43' },
]

function recommend(lengthMm: number): string | null {
  const match = EU_CHART.find((r) => lengthMm >= r.min && lengthMm <= r.max)
  return match?.eu ?? null
}

interface Props {
  availableSizes: string[]
}

const STORAGE_KEY = 'swappa_foot_length_mm'

export function SizeProfilePrompt({ availableSizes }: Props) {
  const [open, setOpen] = useState(false)
  const [length, setLength] = useState('')
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [inStock, setInStock] = useState<boolean | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setLength(saved)
      const rec = recommend(parseInt(saved, 10))
      setRecommendation(rec)
      if (rec) setInStock(availableSizes.includes(rec))
    }
  }, [availableSizes])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const mm = parseInt(length, 10)
    if (isNaN(mm) || mm < 180 || mm > 350) return
    localStorage.setItem(STORAGE_KEY, String(mm))
    const rec = recommend(mm)
    setRecommendation(rec)
    if (rec) setInStock(availableSizes.includes(rec))
    setOpen(false)
  }

  return (
    <div className="mt-4 border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Ruler className="w-4 h-4 text-muted-foreground" />
          {recommendation
            ? `Your size: EU ${recommendation}${inStock === false ? ' (not available)' : ''}`
            : 'Find your size'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground mt-3 mb-3">
            Measure your foot from heel to longest toe. Enter the length in millimetres.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                min={180}
                max={350}
                placeholder="e.g. 245"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
            >
              Get size
            </button>
          </form>

          {recommendation && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${inStock ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              {inStock
                ? `✓ We recommend EU ${recommendation} — and it's available in this shoe.`
                : `We recommend EU ${recommendation}, but this size isn't currently available.`}
            </div>
          )}

          {!recommendation && length && (
            <p className="mt-2 text-xs text-muted-foreground">
              We don't have a size conversion for {length} mm. Try a measurement between 218–280 mm.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
