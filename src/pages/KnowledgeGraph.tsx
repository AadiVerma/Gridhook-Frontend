import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, Check, X, Waypoints } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { kgNodes, kgEdges, KgEdge, KgNode } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const layers = ['STATIC', 'OBSERVED', 'MANUAL', 'LLM'] as const
const layerColor: Record<(typeof layers)[number], string> = {
  STATIC: 'rgb(var(--muted))',
  OBSERVED: 'rgb(var(--info))',
  MANUAL: 'rgb(var(--signal))',
  LLM: 'rgb(var(--violet))',
}

const kindStyle: Record<KgNode['kind'], string> = {
  connector: 'fill-canvas stroke-signal',
  entity: 'fill-canvas stroke-info',
  field: 'fill-canvas stroke-border-strong',
}

export default function KnowledgeGraph() {
  const [activeLayers, setActiveLayers] = useState<string[]>([...layers])
  const [confidence, setConfidence] = useState(0)
  const [selected, setSelected] = useState<{ type: 'node' | 'edge'; id: string } | null>(null)
  const [edgeState, setEdgeState] = useState(kgEdges)

  const visibleEdges = useMemo(
    () => edgeState.filter((e) => activeLayers.includes(e.layer) && e.confidence >= confidence),
    [activeLayers, confidence, edgeState],
  )
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>()
    visibleEdges.forEach((e) => {
      ids.add(e.from)
      ids.add(e.to)
    })
    return ids
  }, [visibleEdges])

  function toggleLayer(l: string) {
    setActiveLayers((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
  }

  function nodeById(id: string) {
    return kgNodes.find((n) => n.id === id)!
  }

  const selectedNode = selected?.type === 'node' ? nodeById(selected.id) : null
  const selectedEdge = selected?.type === 'edge' ? edgeState.find((e) => e.id === selected.id) : null

  function approveEdge(id: string) {
    setEdgeState((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'confirmed' } : e)))
    setSelected(null)
  }

  function rejectEdge(id: string) {
    setEdgeState((prev) => prev.filter((e) => e.id !== id))
    setSelected(null)
  }

  return (
    <AppShell
      title="Knowledge Graph"
      subtitle="Entity relationships discovered across your connectors"
      actions={
        <>
          <Button variant="secondary" size="sm">
            <RefreshCw size={13} /> Rebuild graph
          </Button>
          <Button variant="primary" size="sm">
            <Sparkles size={13} /> Enrich with AI
          </Button>
        </>
      }
      maxWidth="1320px"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {layers.map((l) => (
            <button
              key={l}
              onClick={() => toggleLayer(l)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                activeLayers.includes(l) ? 'border-border-strong/25 text-ink' : 'border-border-strong/10 text-faint opacity-50',
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: layerColor[l] }} />
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-faint">Min confidence</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-32 accent-signal"
          />
          <span className="w-8 font-mono text-[11px] text-muted">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div className="relative h-[520px] overflow-hidden rounded-2xl bg-dotgrid">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-signal/5 via-transparent to-violet/5" />
              <svg viewBox="60 20 950 460" className="h-full w-full">
                {visibleEdges.map((e) => {
                  const a = nodeById(e.from)
                  const b = nodeById(e.to)
                  const mx = (a.x + b.x) / 2
                  const my = (a.y + b.y) / 2
                  const dashed = e.status === 'suggested'
                  return (
                    <g key={e.id} className="cursor-pointer" onClick={() => setSelected({ type: 'edge', id: e.id })}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={layerColor[e.layer]}
                        strokeOpacity={selected?.type === 'edge' && selected.id === e.id ? 1 : 0.45}
                        strokeWidth={selected?.type === 'edge' && selected.id === e.id ? 2 : 1.25}
                        strokeDasharray={dashed ? '4 3' : undefined}
                      />
                      <rect x={mx - 34} y={my - 9} width={68} height={16} rx={8} fill="rgb(var(--surface-raised))" opacity={0.9} />
                      <text x={mx} y={my + 3} textAnchor="middle" fontSize={8.5} fill="rgb(var(--muted))">
                        {e.label.length > 14 ? e.label.slice(0, 13) + '…' : e.label}
                      </text>
                    </g>
                  )
                })}

                {kgNodes
                  .filter((n) => visibleNodeIds.has(n.id))
                  .map((n) => (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelected({ type: 'node', id: n.id })}
                    >
                      <rect
                        x={-46}
                        y={-15}
                        width={92}
                        height={30}
                        rx={n.kind === 'connector' ? 15 : 8}
                        strokeWidth={selected?.type === 'node' && selected.id === n.id ? 2 : 1.25}
                        className={cn(kindStyle[n.kind])}
                      />
                      <text x={0} y={4} textAnchor="middle" fontSize={10} className="fill-ink" fontWeight={n.kind === 'connector' ? 700 : 500}>
                        {n.label}
                      </text>
                    </g>
                  ))}
              </svg>

              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-border-strong/15 bg-surface/90 px-3 py-2 text-[10px] text-muted backdrop-blur">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-signal" />connector</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-info" />entity</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-border-strong" />field</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {!selected && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Waypoints size={22} className="text-faint" />
                <p className="text-sm font-medium text-ink">Select a node or edge</p>
                <p className="text-xs text-muted">Click anything in the graph to inspect or edit it.</p>
                <Button variant="secondary" size="sm" className="mt-2" asChild>
                  <Link to="/knowledge-graph/skills">
                    <Sparkles size={13} /> View AI skills
                  </Link>
                </Button>
              </div>
            )}

            {selectedNode && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-faint">{selectedNode.kind}</p>
                  <p className="text-sm font-semibold text-ink">{selectedNode.label}</p>
                </div>
                <Badge tone="neutral">{selectedNode.layer}</Badge>
                <div className="border-t border-border/10 pt-3 text-xs text-muted">
                  <p>
                    {edgeState.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).length} relationships
                    reference this {selectedNode.kind}.
                  </p>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-faint">Relationship</p>
                  <p className="text-sm font-semibold text-ink">
                    {nodeById(selectedEdge.from).label} → {nodeById(selectedEdge.to).label}
                  </p>
                  <p className="mt-1 text-xs text-muted">"{selectedEdge.label}"</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone="neutral">{selectedEdge.layer}</Badge>
                  <Badge tone={selectedEdge.confidence > 0.8 ? 'ok' : selectedEdge.confidence > 0.6 ? 'warn' : 'bad'}>
                    {Math.round(selectedEdge.confidence * 100)}% confidence
                  </Badge>
                </div>
                {selectedEdge.status === 'suggested' ? (
                  <div className="flex gap-2 border-t border-border/10 pt-3">
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => approveEdge(selectedEdge.id)}>
                      <Check size={13} /> Approve
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => rejectEdge(selectedEdge.id)}>
                      <X size={13} /> Reject
                    </Button>
                  </div>
                ) : (
                  <p className="border-t border-border/10 pt-3 text-xs text-ok">Confirmed relationship</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
