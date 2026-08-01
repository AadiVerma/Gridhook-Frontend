import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Wrench, Download, ArrowRight, Store, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import { AUTH_TYPE_OPTIONS } from '@/lib/connector-api'
import { AdapterTemplate, CATEGORY_LABELS, TemplateCategory, TemplateToolPreview, marketplaceApi } from '@/lib/marketplace-api'

const authLabel = (authType: AdapterTemplate['authType']) =>
  AUTH_TYPE_OPTIONS.find((o) => o.value === authType)?.label ?? authType

export default function Marketplace() {
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<AdapterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | TemplateCategory>('all')

  const [installing, setInstalling] = useState<AdapterTemplate | null>(null)
  const [installName, setInstallName] = useState('')
  const [installSubmitting, setInstallSubmitting] = useState(false)
  const [installError, setInstallError] = useState('')

  const [previewing, setPreviewing] = useState<AdapterTemplate | null>(null)
  const [toolPreviews, setToolPreviews] = useState<Record<string, TemplateToolPreview[]>>({})
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Only a handful of templates exist today, so fetch the full catalog once and filter
      // client-side rather than round-tripping on every keystroke.
      setTemplates(await marketplaceApi.list())
    } catch (err) {
      setError(errorMessage(err, 'Unable to load the marketplace. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(() => Array.from(new Set(templates.map((t) => t.category))), [templates])

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) => (category === 'all' || t.category === category) && t.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [templates, query, category],
  )

  function openInstall(t: AdapterTemplate) {
    setInstalling(t)
    setInstallName(t.name)
    setInstallError('')
  }

  async function openPreview(t: AdapterTemplate) {
    setPreviewing(t)
    setPreviewError('')
    if (toolPreviews[t.key]) return
    setPreviewLoading(true)
    try {
      const tools = await marketplaceApi.previewTools(t.key)
      setToolPreviews((prev) => ({ ...prev, [t.key]: tools }))
    } catch (err) {
      setPreviewError(errorMessage(err, 'Could not load the tool list for this template.'))
    } finally {
      setPreviewLoading(false)
    }
  }

  async function confirmInstall() {
    if (!installing) return
    setInstallSubmitting(true)
    setInstallError('')
    try {
      const result = await marketplaceApi.install(installing.key, installName)
      setTemplates((prev) => prev.map((t) => (t.id === installing.id ? { ...t, installCount: t.installCount + 1 } : t)))
      setInstalling(null)
      toast.success(`"${result.connector.name}" installed — add credentials to activate it`)
      navigate(`/connectors/${result.connector.id}`)
    } catch (err) {
      setInstallError(errorMessage(err, 'Could not install this template. Please try again.'))
    } finally {
      setInstallSubmitting(false)
    }
  }

  const isEmptyCatalog = !loading && !error && templates.length === 0

  return (
    <AppShell title="Marketplace" subtitle={`${templates.length} pre-built adapter${templates.length === 1 ? '' : 's'} ready to install`} backTo="/connectors">
      {!isEmptyCatalog && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Search adapters…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory('all')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === 'all'
                  ? 'border-signal/50 bg-signal/10 text-signal'
                  : 'border-border-strong/15 text-muted hover:text-ink'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  category === c
                    ? 'border-signal/50 bg-signal/10 text-signal'
                    : 'border-border-strong/15 text-muted hover:text-ink'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="animate-pulse space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-faint/10" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 rounded bg-faint/10" />
                    <div className="h-2 w-16 rounded bg-faint/10" />
                  </div>
                </div>
                <div className="h-2 w-full rounded bg-faint/10" />
                <div className="h-8 w-full rounded-lg bg-faint/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Store size={22} className="text-bad" />
          <p className="text-sm font-medium text-ink">Couldn't load the marketplace</p>
          <p className="text-xs text-muted">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={load}>
            <RefreshCw size={13} /> Retry
          </Button>
        </Card>
      )}

      {isEmptyCatalog && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Store size={22} className="text-faint" />
          <p className="text-sm font-medium text-ink">No adapters in the catalog yet</p>
          <p className="text-xs text-muted">Check back once an admin publishes a template.</p>
        </Card>
      )}

      {!loading && !error && !isEmptyCatalog && filtered.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Search size={20} className="text-faint" />
          <p className="text-sm font-medium text-ink">No adapters match your search</p>
          <p className="text-xs text-muted">Try a different keyword or category.</p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-xs font-bold text-ink">
                    {t.glyph || t.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-[11px] text-faint">{CATEGORY_LABELS[t.category]}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-xs text-muted">{t.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{authLabel(t.authType)}</Badge>
                  <button onClick={() => openPreview(t)} className="transition-opacity hover:opacity-70">
                    <Badge tone="neutral">
                      <Wrench size={9} className="mr-1" /> {t.toolCount} tool{t.toolCount === 1 ? '' : 's'}
                    </Badge>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                  <span className="flex items-center gap-1 text-[11px] text-faint">
                    <Download size={11} /> {t.installCount} install{t.installCount === 1 ? '' : 's'}
                  </span>
                  <Button size="sm" variant="primary" onClick={() => openInstall(t)}>
                    Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!installing}
        onClose={() => (installSubmitting ? undefined : setInstalling(null))}
        title={installing ? `Install ${installing.name}` : ''}
        description={installing ? `Creates a new connector with ${installing.toolCount} tools from this template.` : undefined}
      >
        {installing && (
          <div className="space-y-4">
            <Field label="Connector name">
              <Input value={installName} onChange={(e) => setInstallName(e.target.value)} />
            </Field>

            <div className="flex items-start gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-3 text-xs text-muted">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-faint" />
              <span>
                The connector is created with {authLabel(installing.authType)} auth but no credentials. You'll add those on
                the connector's page right after this.
              </span>
            </div>

            {installError && <p className="text-xs text-bad">{installError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInstalling(null)} disabled={installSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={confirmInstall} disabled={installSubmitting || !installName.trim()}>
                {installSubmitting ? 'Installing…' : 'Install adapter'} <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!previewing}
        onClose={() => setPreviewing(null)}
        title={previewing ? `${previewing.name} tools` : ''}
        description={previewing ? `${previewing.toolCount} tools this template would create — nothing is installed yet.` : undefined}
      >
        {previewing && (
          <div className="space-y-4">
            {previewLoading && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-faint/10" />
                ))}
              </div>
            )}

            {!previewLoading && previewError && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertTriangle size={18} className="text-bad" />
                <p className="text-xs text-muted">{previewError}</p>
                <Button variant="secondary" size="sm" onClick={() => openPreview(previewing)}>
                  <RefreshCw size={12} /> Retry
                </Button>
              </div>
            )}

            {!previewLoading && !previewError && (
              <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {(toolPreviews[previewing.key] ?? []).map((tool) => (
                  <div key={`${tool.method}-${tool.path}`} className="rounded-lg border border-border-strong/15 bg-canvas/40 p-2.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={tool.method === 'GET' ? 'info' : 'signal'}>{tool.method}</Badge>
                      <span className="truncate text-xs font-medium text-ink">{tool.name}</span>
                      <span className="ml-auto truncate font-mono text-[11px] text-faint">{tool.path}</span>
                    </div>
                    {tool.description && <p className="mt-1.5 text-[11px] text-muted">{tool.description}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewing(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const t = previewing
                  setPreviewing(null)
                  openInstall(t)
                }}
              >
                Install adapter <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
