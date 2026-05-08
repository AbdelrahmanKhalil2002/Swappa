'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Upload, Images, RotateCcw } from 'lucide-react'
import { get, del, upload } from '../../../lib/api-client'

type MediaType = 'GALLERY' | 'FRAME_360'

interface MediaItem {
  id: string
  url: string
  alt: string | null
  type: MediaType
  position: number
  createdAt: string
  baseShoe: { id: string; name: string; slug: string } | null
  heelStyle: { id: string; name: string; slug: string } | null
}

interface PageResult {
  items: MediaItem[]
  total: number
  page: number
  pages: number
}

const TYPE_LABELS: Record<MediaType, string> = {
  GALLERY: 'Gallery',
  FRAME_360: '360° Frame',
}

export default function MediaLibraryPage() {
  const [data, setData] = useState<PageResult | null>(null)
  const [filter, setFilter] = useState<MediaType | ''>('')
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load(p = page, f = filter) {
    const params = new URLSearchParams({ page: String(p), limit: '48' })
    if (f) params.set('type', f)
    const result = await get<PageResult>(`/media?${params}`)
    setData(result)
  }

  useEffect(() => { load() }, [page, filter])

  function onFilterChange(f: MediaType | '') {
    setFilter(f)
    setPage(1)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset?')) return
    try {
      await del(`/media/${id}`)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Delete failed') }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'media-library')
        fd.append('alt', file.name)
        await upload('/media/upload', fd)
      }
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Media library</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} asset{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(['', 'GALLERY', 'FRAME_360'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f
                ? 'bg-foreground text-background'
                : 'border hover:bg-muted'
            }`}
          >
            {f === '' ? 'All' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {!data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Images className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No assets yet. Upload your first image.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {data.items.map((m) => (
            <div key={m.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <Image src={m.url} alt={m.alt ?? ''} fill className="object-cover" sizes="120px" />

              {/* Type badge */}
              <div className="absolute top-1 left-1">
                {m.type === 'FRAME_360' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] rounded font-medium">
                    <RotateCcw className="w-2.5 h-2.5" />
                    360
                  </span>
                )}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* Entity link */}
              {(m.baseShoe || m.heelStyle) && (
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white truncate">
                    {m.baseShoe
                      ? <Link href={`/catalog/shoes/${m.baseShoe.id}`} className="hover:underline">{m.baseShoe.name}</Link>
                      : <Link href={`/catalog/heel-styles/${m.heelStyle!.id}`} className="hover:underline">{m.heelStyle!.name}</Link>
                    }
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
