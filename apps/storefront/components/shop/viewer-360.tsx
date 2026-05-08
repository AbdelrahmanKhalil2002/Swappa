'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { RotateCcw } from 'lucide-react'

interface Props {
  frames: { url: string; alt: string | null }[]
}

export function Viewer360({ frames }: Props) {
  const [frame, setFrame] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startFrame = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  function getFrameFromDelta(delta: number) {
    const sensitivity = Math.max(1, Math.floor(600 / frames.length))
    const steps = Math.round(delta / sensitivity)
    return ((startFrame.current + steps) % frames.length + frames.length) % frames.length
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    startX.current = e.clientX
    startFrame.current = frame
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setFrame(getFrameFromDelta(e.clientX - startX.current))
  }

  function onPointerUp() { setDragging(false) }

  // Touch support
  const touchStartX = useRef(0)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    startFrame.current = frame
  }
  function onTouchMove(e: React.TouchEvent) {
    setFrame(getFrameFromDelta(e.touches[0].clientX - touchStartX.current))
  }

  useEffect(() => {
    // Preload all frames
    frames.forEach((f) => { const img = new window.Image(); img.src = f.url })
  }, [frames])

  if (frames.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="relative aspect-square bg-muted rounded-2xl overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
    >
      <Image
        src={frames[frame].url}
        alt={frames[frame].alt ?? `Frame ${frame + 1}`}
        fill
        priority
        className="object-cover pointer-events-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
        draggable={false}
      />
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
        <RotateCcw className="w-3.5 h-3.5 text-white/70" />
        <span className="text-xs text-white/70">Drag to rotate</span>
      </div>
      {/* Frame dots */}
      <div className="absolute top-3 right-3 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
        {frame + 1}/{frames.length}
      </div>
    </div>
  )
}
