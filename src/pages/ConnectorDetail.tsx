import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Wrench, Play, Trash2, Settings2, Check, X, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Field, Textarea } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { connectors, toolsForConnector, ConnectorTool, paramsForTool, sampleRequestForTool, sampleResponseForTool } from '@/lib/mock-data'

export default function ConnectorDetail() {
  const { id } = useParams()
  const seedConnector = connectors.find((c) => c.id === id) ?? connectors[0]
  const [connector, setConnector] = useState(seedConnector)
  const [tools, setTools] = useState<ConnectorTool[]>(() => toolsForConnector(seedConnector))
  const [editorOpen, setEditorOpen] = useState(false)
  const [toolName, setToolName] = useState('')
  const [toolMethod, setToolMethod] = useState<ConnectorTool['method']>('GET')
  const [toolPath, setToolPath] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ tool: string; ok: boolean } | null>(null)
  const [viewingTool, setViewingTool] = useState<ConnectorTool | null>(null)
  const [viewName, setViewName] = useState('')
  const [viewPath, setViewPath] = useState('')
  const [pendingDeleteTool, setPendingDeleteTool] = useState<ConnectorTool | null>(null)

  useEffect(() => {
    setConnector(seedConnector)
    setTools(toolsForConnector(seedConnector))
  }, [seedConnector])

  function toggleConnectorActive() {
    setConnector((prev) => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))
  }

  function runTool(t: ConnectorTool) {
    setRunningId(t.id)
    setTimeout(() => {
      setRunningId(null)
      setRunResult({ tool: t.name, ok: connector.status === 'active' })
      setTimeout(() => setRunResult(null), 2200)
    }, 700)
  }

  function openToolDetails(t: ConnectorTool) {
    setViewingTool(t)
    setViewName(t.name)
    setViewPath(t.path)
  }

  function saveToolDetails() {
    if (!viewingTool) return
    setTools((prev) => prev.map((t) => (t.id === viewingTool.id ? { ...t, name: viewName, path: viewPath } : t)))
    setViewingTool(null)
  }

  function confirmDeleteTool() {
    if (!pendingDeleteTool) return
    setTools((prev) => prev.filter((t) => t.id !== pendingDeleteTool.id))
    setPendingDeleteTool(null)
  }

  function saveTool() {
    setTools((prev) => [
      ...prev,
      { id: `${connector.id}_tool_custom_${prev.length}`, name: toolName, method: toolMethod, path: toolPath || '/', cached: false },
    ])
    setToolName('')
    setToolPath('')
    setToolMethod('GET')
    setEditorOpen(false)
  }

  return (
    <AppShell title={connector.name} subtitle={connector.baseUrl} backTo="/connectors">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="signal">{connector.type}</Badge>
        <Badge tone="neutral">{connector.authType}</Badge>
        <StatusPill tone={connector.status === 'active' ? 'ok' : connector.status === 'error' ? 'bad' : 'neutral'}>
          {connector.status}
        </StatusPill>
        <div className="flex items-center gap-2 rounded-full border border-border-strong/15 bg-surface px-3 py-1">
          <Switch checked={connector.status === 'active'} onChange={toggleConnectorActive} />
          <span className="text-xs text-muted">{connector.status === 'active' ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tools</CardTitle>
            <CardDescription>
              {tools.length} callable MCP tools mapped from {connector.baseUrl}
            </CardDescription>
          </div>
          <Button variant="primary" size="sm" onClick={() => setEditorOpen(true)}>
            <Plus size={14} /> New tool
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {runResult && (
            <div
              className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs animate-fade-in ${
                runResult.ok ? 'border-ok/25 bg-ok/10 text-ok' : 'border-bad/25 bg-bad/10 text-bad'
              }`}
            >
              {runResult.ok ? <Check size={13} /> : <X size={13} />}
              <span className="font-mono">{runResult.tool}</span>
              {runResult.ok ? 'ran successfully' : `failed — ${connector.name} connector is reporting errors`}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-faint">
                  <th className="pb-2 font-medium">Tool</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Path</th>
                  <th className="pb-2 font-medium">Cache</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {tools.map((t) => (
                  <tr key={t.id} className="group">
                    <td className="py-2.5 font-mono text-xs text-ink">
                      <button
                        onClick={() => openToolDetails(t)}
                        className="flex items-center gap-1.5 hover:text-signal"
                        title="View payload and parameters"
                      >
                        <Wrench size={12} className="text-signal" /> {t.name}
                        <ChevronRight size={11} className="text-faint" />
                      </button>
                    </td>
                    <td className="py-2.5">
                      <Badge tone={t.method === 'GET' ? 'info' : 'signal'}>{t.method}</Badge>
                    </td>
                    <td className="py-2.5 font-mono text-xs text-muted">{t.path}</td>
                    <td className="py-2.5 text-xs text-muted">{t.cached ? '60s TTL' : 'off'}</td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => runTool(t)}
                          disabled={runningId === t.id}
                          className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-signal disabled:opacity-40"
                          title="Run tool"
                        >
                          <Play size={13} className={runningId === t.id ? 'animate-pulse' : ''} />
                        </button>
                        <button
                          onClick={() => openToolDetails(t)}
                          className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink"
                          title="Edit tool"
                        >
                          <Settings2 size={13} />
                        </button>
                        <button
                          onClick={() => setPendingDeleteTool(t)}
                          className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad"
                          title="Delete tool"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tools.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-faint">
                      No tools mapped yet on this connector.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="New tool"
        description={`Map an endpoint on ${connector.name} to a callable MCP tool`}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Field label="Tool name" hint="snake_case, shown to the LLM as the callable function name">
            <Input placeholder="get_customer_balance" value={toolName} onChange={(e) => setToolName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Method">
              <Select value={toolMethod} onChange={(e) => setToolMethod(e.target.value as ConnectorTool['method'])}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Path">
                <Input placeholder="/customers/{id}/balance" value={toolPath} onChange={(e) => setToolPath(e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Description" hint="Helps the model decide when to call this tool.">
            <Textarea rows={2} placeholder="Returns the outstanding balance for a customer." />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!toolName} onClick={saveTool}>
              Save tool
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewingTool}
        onClose={() => setViewingTool(null)}
        title={viewingTool ? viewingTool.name : ''}
        description="Full request/response contract for this tool"
        className="max-w-2xl"
      >
        {viewingTool && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Method">
                <Select value={viewingTool.method} disabled className="opacity-60">
                  <option>{viewingTool.method}</option>
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label="Path">
                  <Input value={viewPath} onChange={(e) => setViewPath(e.target.value)} className="font-mono" />
                </Field>
              </div>
            </div>
            <Field label="Tool name">
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} className="font-mono" />
            </Field>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Parameters</p>
              {paramsForTool(viewingTool).length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border-strong/15">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-canvas/40 text-[10px] uppercase tracking-wide text-faint">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">In</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Required</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {paramsForTool(viewingTool).map((p) => (
                        <tr key={p.name}>
                          <td className="px-3 py-2 font-mono text-ink">{p.name}</td>
                          <td className="px-3 py-2 text-muted">{p.in}</td>
                          <td className="px-3 py-2 font-mono text-muted">{p.type}</td>
                          <td className="px-3 py-2">
                            {p.required ? <Badge tone="signal">required</Badge> : <Badge tone="neutral">optional</Badge>}
                          </td>
                          <td className="px-3 py-2 text-muted">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-faint">This tool takes no parameters.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted">Sample request</p>
                <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                  {JSON.stringify(sampleRequestForTool(viewingTool), null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted">Sample response</p>
                <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                  {JSON.stringify(sampleResponseForTool(viewingTool), null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setViewingTool(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={saveToolDetails}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!pendingDeleteTool}
        onClose={() => setPendingDeleteTool(null)}
        title="Delete tool"
        description={
          pendingDeleteTool
            ? `This removes "${pendingDeleteTool.name}" from every MCP server it's exposed on. This cannot be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteTool(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDeleteTool}>
            <Trash2 size={13} /> Delete tool
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
