import { Field } from '@/components/ui/Input'
import { ParamRowsTable } from './ParamRowsTable'
import { CodeEditor } from './CodeEditor'
import { ToolParamRow } from '@/lib/tool-params'

export function RestParamsEditor({
  rows,
  bodyJson,
  showBody,
  onChangeRows,
  onChangeBody,
}: {
  rows: ToolParamRow[]
  bodyJson: string
  showBody: boolean
  onChangeRows: (rows: ToolParamRow[]) => void
  onChangeBody: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Parameters" hint="Path, query, and header parameters passed when calling this tool.">
        <ParamRowsTable rows={rows} onChange={onChangeRows} locationOptions={['path', 'query', 'header']} />
      </Field>
      {showBody && (
        <Field label="Request body (JSON)" hint="Optional — sent as the request body.">
          <CodeEditor lang="json" value={bodyJson} onChange={onChangeBody} placeholder="{}" />
        </Field>
      )}
    </div>
  )
}
