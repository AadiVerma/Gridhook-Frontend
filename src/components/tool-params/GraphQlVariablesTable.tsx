import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { GraphQlVariableRow, createEmptyVariableRow } from '@/lib/tool-params'

export function GraphQlVariablesTable({
  rows,
  onChange,
}: {
  rows: GraphQlVariableRow[]
  onChange: (rows: GraphQlVariableRow[]) => void
}) {
  function updateRow(id: string, patch: Partial<GraphQlVariableRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function addRow() {
    onChange([...rows, createEmptyVariableRow()])
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-faint">No variables yet.</p>}
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border-strong/10 p-2">
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Input placeholder="name" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
            <Input placeholder="type, e.g. ID, String" value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value })} />
            <Input
              placeholder="description"
              value={row.description}
              onChange={(e) => updateRow(row.id, { description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={row.required} onChange={(v) => updateRow(row.id, { required: v })} />
            <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addRow}>
        <Plus size={13} /> Add variable
      </Button>
    </div>
  )
}
