import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plug, Plus, Search, Upload, Download, Trash2, MoreVertical, RefreshCw, Store, FileJson, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Field, Textarea } from '@/components/ui/Input'
import { Badge, StatusPill, Tone } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { api, ApiError } from '@/lib/api-client'
import { useConnectorsStore, BackendEngineType, BackendAuthType } from '@/lib/connectors-store'
import { timeAgo } from '@/lib/utils'

const typeTone: Record<BackendEngineType, Tone> = {
  REST: 'signal',
  GRAPHQL: 'violet',
  SOAP: 'warn',
}

const typeLabel: Record<BackendEngineType, string> = {
  REST: 'REST',
  GRAPHQL: 'GraphQL',
  SOAP: 'SOAP',
}

const authLabel: Record<BackendAuthType, string> = {
  oauth2: 'OAuth2',
  bearer: 'Bearer',
  api_key: 'API Key',
  basic: 'Basic',
  login_token: 'Login Token',
  none: 'None',
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

export default function Connectors() {
  const navigate = useNavigate()
  const { connectors: items, loading, error, refetch, toggleConnector, deleteConnector, runHealthCheck } = useConnectorsStore()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | BackendEngineType>('all')
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emptyStateRef = useRef<HTMLDivElement>(null)
  const [emptyStateHeight, setEmptyStateHeight] = useState(520)

  useLayoutEffect(() => {
    function measure() {
      const el = emptyStateRef.current
      if (!el) return
      const footer = document.querySelector('footer')
      const footerHeight = footer?.getBoundingClientRect().height ?? 0
      const available = window.innerHeight - el.getBoundingClientRect().top - footerHeight
      setEmptyStateHeight(Math.max(420, available))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [items.length])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const filtered = useMemo(
    () =>
      items.filter((c) => {
        const q = query.toLowerCase()
        const matchesQuery = c.name.toLowerCase().includes(q)
        const matchesType = typeFilter === 'all' || c.engineTypes.includes(typeFilter)
        return matchesQuery && matchesType
      }),
    [items, query, typeFilter],
  )

  async function confirmDelete() {
    if (pendingDelete == null) return
    const id = pendingDelete
    const name = items.find((c) => c.id === id)?.name ?? 'Connector'
    setPendingDelete(null)
    try {
      await deleteConnector(id)
      toast.success(`"${name}" deleted`)
    } catch (err) {
      toast.error(errorMessage(err, `Couldn't delete "${name}"`))
    }
  }

  async function exportSpec(c: (typeof items)[number]) {
    setOpenMenu(null)
    try {
      const spec = await api.get(`/connectors/${c.id}/export`)
      downloadJson(`${c.name.toLowerCase().replace(/\s+/g, '-')}.spec.json`, spec)
    } catch (err) {
      toast.error(errorMessage(err, `Couldn't export "${c.name}"`))
    }
  }

  async function runHealthCheckFor(c: (typeof items)[number]) {
    setOpenMenu(null)
    setCheckingId(c.id)
    try {
      await runHealthCheck(c.id)
      toast.success(`"${c.name}" health check passed`)
    } catch (err) {
      toast.error(errorMessage(err, `Health check failed for "${c.name}"`))
    } finally {
      setCheckingId(null)
    }
  }

  async function toggleActive(c: (typeof items)[number]) {
    try {
      await toggleConnector(c.id, c.status !== 'active')
    } catch (err) {
      toast.error(errorMessage(err, `Couldn't update "${c.name}"`))
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      setImportText(text)
      setImportName(file.name.replace(/\.(json|ya?ml)$/i, ''))
    })
  }

  async function confirmImport() {
    setImportError('')
    if (!importText.trim()) {
      setImportError('Paste a spec or upload a file first.')
      return
    }
    setImporting(true)
    try {
      const params = new URLSearchParams({ format: 'openapi', ...(importName.trim() ? { name: importName.trim() } : {}) })
      const result = await api.postRaw<{ connector: { id: number; name: string } }>(
        `/connectors/import?${params.toString()}`,
        importText,
      )
      setImportOpen(false)
      setImportText('')
      setImportName('')
      toast.success(`"${result.connector.name}" imported`)
      await refetch()
      navigate(`/connectors/${result.connector.id}`)
    } catch (err) {
      setImportError(errorMessage(err, 'Could not import this spec — check the format and try again.'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppShell
      title="Connectors"
      subtitle={`${items.length} integrations wired into your MCP servers`}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import spec
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link to="/connectors/new">
              <Plus size={14} /> Add connector
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Search connectors by name…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="sm:w-44">
          <option value="all">All types</option>
          <option value="REST">REST</option>
          <option value="GRAPHQL">GraphQL</option>
          <option value="SOAP">SOAP</option>
        </Select>
      </div>

      {loading ? (
        <Card className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong/30 border-t-signal" />
          <p className="text-sm text-muted">Loading connectors…</p>
        </Card>
      ) : error ? (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Store size={22} className="text-bad" />
          <p className="text-sm font-medium text-ink">Couldn't load connectors</p>
          <p className="text-xs text-muted">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={refetch}>
            <RefreshCw size={13} /> Retry
          </Button>
        </Card>
      ) : (
      <>
      {items.length === 0 ? (
        <div
          ref={emptyStateRef}
          className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border/10"
          style={{ height: emptyStateHeight }}
        >
          <div className="pointer-events-none absolute inset-0 bg-dotgrid" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(55% 55% at 50% 45%, transparent, rgb(var(--canvas)) 100%)' }}
          />
          <div className="pointer-events-none absolute left-1/2 top-[45%] h-[420px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/15 blur-[130px]" />

          <div className="relative flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong/15 bg-surface text-signal shadow-panel">
              <Plug size={26} />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">No connectors yet</p>
              <p className="mt-2 text-sm text-muted">
                Wire up a REST, GraphQL, or SOAP API and expose it as MCP tools in minutes.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Badge tone="neutral">REST</Badge>
              <Badge tone="neutral">GraphQL</Badge>
              <Badge tone="neutral">SOAP</Badge>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/connectors/new">
                  <Plus size={14} /> Add a connector
                </Link>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> Import a spec
              </Button>
            </div>
            <Link to="/connectors/store" className="text-xs font-medium text-faint hover:text-signal">
              or browse the marketplace
            </Link>
          </div>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const types = c.engineTypes
          const auths = c.authTypes
          return (
          <Card key={c.id} className="group relative overflow-visible transition-colors hover:border-signal/30">
            <CardContent className="p-4">
              <Link to={`/connectors/${c.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Open ${c.name}`} />
              <div className="pointer-events-none flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-xs font-bold text-ink">
                    {c.glyph || c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-[11px] text-faint">{c.description}</p>
                  </div>
                </div>
                <div className="pointer-events-auto relative z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpenMenu(openMenu === c.id ? null : c.id)
                    }}
                    className="rounded-md p-1.5 text-faint opacity-0 transition-opacity hover:bg-surface-raised hover:text-ink group-hover:opacity-100"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenu === c.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border-strong/15 bg-surface-raised p-1 shadow-2xl animate-fade-in"
                    >
                      <button
                        onClick={() => runHealthCheckFor(c)}
                        disabled={checkingId === c.id}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-canvas/60 hover:text-ink disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={checkingId === c.id ? 'animate-spin' : ''} />
                        {checkingId === c.id ? 'Checking…' : 'Health check'}
                      </button>
                      <button
                        onClick={() => exportSpec(c)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-canvas/60 hover:text-ink"
                      >
                        <Download size={13} /> Export spec
                      </button>
                      <button
                        onClick={() => {
                          setPendingDelete(c.id)
                          setOpenMenu(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-bad hover:bg-bad/10"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pointer-events-none mt-4 flex flex-wrap items-center gap-1.5">
                {types.length === 1 ? <Badge tone={typeTone[types[0]]}>{typeLabel[types[0]]}</Badge> : <Badge tone="neutral">Mixed types</Badge>}
                {auths.length === 1 ? <Badge tone="neutral">{authLabel[auths[0]]}</Badge> : <Badge tone="neutral">Mixed auth</Badge>}
                <Badge tone="neutral">{c.toolCount} tools</Badge>
                {c.moduleCount > 1 && <Badge tone="neutral">{c.moduleCount} modules</Badge>}
              </div>

              <div className="pointer-events-none mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                <div
                  className="pointer-events-auto relative z-20 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch checked={c.status === 'active'} onChange={() => toggleActive(c)} />
                  <StatusPill tone={c.status === 'active' ? 'ok' : c.status === 'error' ? 'bad' : 'neutral'} dot={c.status !== 'active'}>
                    {c.status}
                  </StatusPill>
                </div>
                <span className="pointer-events-none text-[11px] text-faint">{c.lastSync ? `synced ${timeAgo(c.lastSync)}` : 'never synced'}</span>
              </div>
            </CardContent>
          </Card>
          )
        })}

        <Link
          to="/connectors/new"
          className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong/25 text-muted transition-colors hover:border-signal/40 hover:text-signal"
        >
          <Plug size={20} />
          <span className="text-sm font-medium">Add a connector</span>
          <span className="text-[11px] text-faint">or browse the marketplace</span>
        </Link>
      </div>

      {filtered.length === 0 && (
        <Card className="mt-4 flex flex-col items-center gap-2 py-14 text-center">
          <Store size={22} className="text-faint" />
          <p className="text-sm font-medium text-ink">No connectors match your filters</p>
          <p className="text-xs text-muted">Try clearing the search or type filter.</p>
        </Card>
      )}
      </>
      )}
      </>
      )}

      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete connector"
        description="This removes the connector and disables any MCP tools built on top of it. This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            <Trash2 size={13} /> Delete connector
          </Button>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setImportError('')
        }}
        title="Import spec"
        description="Upload an OpenAPI/Swagger JSON file, or paste the spec directly."
        className="max-w-xl"
      >
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/25 py-6 text-muted transition-colors hover:border-signal/40 hover:text-signal"
          >
            <FileJson size={20} />
            <span className="text-sm font-medium">Click to upload a spec file</span>
            <span className="text-[11px] text-faint">.json, .yaml — or paste below</span>
          </button>

          <Field label="Connector name" hint="Auto-filled from the spec's title when available.">
            <Input placeholder="e.g. Internal Billing API" value={importName} onChange={(e) => setImportName(e.target.value)} />
          </Field>

          <Field label="Spec contents">
            <Textarea
              rows={6}
              placeholder='{"openapi": "3.0.0", "info": {"title": "My API"}, "servers": [{"url": "https://api.example.com"}] }'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          {importError && <p className="text-xs text-bad">{importError}</p>}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmImport} disabled={importing}>
              <Check size={13} /> {importing ? 'Importing…' : 'Import connector'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
