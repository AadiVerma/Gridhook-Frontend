import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export interface KeyValueRow {
  id: string
  name: string
  value: string
}

export function KeyValueRowsTable({
  rows,
  onChange,
  addLabel = 'Add row',
}: {
  rows: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  addLabel?: string
}) {
  function updateRow(id: string, patch: Partial<KeyValueRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function addRow() {
    onChange([...rows, { id: `kv-${rows.length}-${Math.floor(Math.random() * 1e6)}`, name: '', value: '' }])
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-faint">No headers yet.</p>}
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border-strong/10 p-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Input placeholder="name" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
            <Input placeholder="value" value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addRow}>
        <Plus size={13} /> {addLabel}
      </Button>
    </div>
  )
}
