import { Plus, Trash2 } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { ToolParamRow, createEmptyParamRow } from '@/lib/tool-params'

const TYPE_OPTIONS: ToolParamRow['type'][] = ['string', 'number', 'integer', 'boolean', 'object', 'array']

export function ParamRowsTable({
  rows,
  onChange,
  locationOptions,
  addLabel = 'Add parameter',
}: {
  rows: ToolParamRow[]
  onChange: (rows: ToolParamRow[]) => void
  locationOptions: ToolParamRow['in'][]
  addLabel?: string
}) {
  function updateRow(id: string, patch: Partial<ToolParamRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function addRow() {
    onChange([...rows, createEmptyParamRow({ in: locationOptions[0] })])
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-faint">No parameters yet.</p>
      )}
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border-strong/10 p-2">
          <div className="grid flex-1 grid-cols-4 gap-2">
            <Input
              placeholder="name"
              className="col-span-1"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
            />
            {locationOptions.length > 1 ? (
              <Select
                className="col-span-1"
                value={row.in}
                onChange={(e) => updateRow(row.id, { in: e.target.value as ToolParamRow['in'] })}
              >
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>
            ) : (
              <Select className="col-span-1" value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value as ToolParamRow['type'] })}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
            {locationOptions.length > 1 && (
              <Select className="col-span-1" value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value as ToolParamRow['type'] })}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
            <Input
              placeholder="description"
              className={locationOptions.length > 1 ? 'col-span-1' : 'col-span-2'}
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
        <Plus size={13} /> {addLabel}
      </Button>
    </div>
  )
}
