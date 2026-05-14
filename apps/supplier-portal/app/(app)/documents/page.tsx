'use client'

import { useEffect, useState } from 'react'
import { FileText, Upload, Loader2, ExternalLink } from 'lucide-react'
import { get, post } from '../../../lib/api-client'

interface Doc {
  id: string; name: string; url: string; docType: string; poId: string | null; createdAt: string
}

const DOC_TYPES = ['DELIVERY_NOTE', 'INVOICE', 'CERTIFICATE', 'GENERAL']

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Upload form (URL-based since we don't have media upload in this portal)
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docType, setDocType] = useState('DELIVERY_NOTE')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    try { const data = await get<Doc[]>('/procurement/portal/documents'); setDocs(data) }
    catch { /* noop */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!docName || !docUrl) return
    setUploading(true); setError('')
    try {
      await post('/procurement/portal/documents', {
        name: docName, url: docUrl, key: docUrl, docType,
      })
      setDocName(''); setDocUrl(''); setDocType('DELIVERY_NOTE'); setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setUploading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">Delivery notes, invoices, and certificates</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="bg-white border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Upload document</h2>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Document name</label>
            <input value={docName} onChange={(e) => setDocName(e.target.value)} required
              placeholder="e.g. Delivery Note #123"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Document URL</label>
            <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} required type="url"
              placeholder="https://…"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white">
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={uploading}
              className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border text-sm font-medium rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No documents uploaded yet.</div>
      ) : (
        <div className="bg-white border rounded-2xl divide-y overflow-hidden">
          {docs.map((d) => (
            <div key={d.id} className="px-5 py-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.docType.replace('_', ' ')} ·{' '}
                  {new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
