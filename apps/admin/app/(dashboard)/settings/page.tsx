'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { get, patch } from '../../../lib/api-client'
import { PageHeader } from '../../../components/ui/page-header'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    get<Record<string, string>>('/settings')
      .then(setSettings)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  function handleChange(key: string, value: string) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const updated = await patch<Record<string, string>>('/settings', settings)
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Global configuration for the store."
      />

      <form onSubmit={handleSave} className="mt-6 space-y-6">

        {/* Inventory */}
        <div className="border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Inventory</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Low-stock threshold</label>
            <p className="text-xs text-muted-foreground">
              Variants with available stock below this number are highlighted as low stock.
            </p>
            <input
              type="number"
              min="0"
              value={settings?.low_stock_threshold ?? '5'}
              onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
              className="w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
