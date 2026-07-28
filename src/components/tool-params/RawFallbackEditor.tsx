import { Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CodeEditor } from './CodeEditor'
import { BackendEngineType } from '@/lib/connectors-store'
import { createEmptyParamsState } from '@/lib/tool-params'

export function RawFallbackEditor({
  engineType,
  rawJson,
  onChangeRawJson,
  onReset,
}: {
  engineType: BackendEngineType
  rawJson: string
  onChangeRawJson: (value: string) => void
  onReset: (state: ReturnType<typeof createEmptyParamsState>) => void
}) {
  return (
    <Field
      label="Parameters (JSON)"
      hint="Couldn't load these into the structured editor — editing as raw JSON."
    >
      <div className="space-y-2">
        <CodeEditor lang="json" value={rawJson} onChange={onChangeRawJson} placeholder="{}" />
        <Button variant="secondary" size="sm" onClick={() => onReset(createEmptyParamsState(engineType))}>
          Reset to structured mode
        </Button>
      </div>
    </Field>
  )
}
