import { Field } from '@/components/ui/Input'
import { ParamRowsTable } from './ParamRowsTable'
import { CodeEditor } from './CodeEditor'
import { ToolParamRow } from '@/lib/tool-params'

export function SoapParamsEditor({
  headerRows,
  bodyXml,
  onChangeHeaderRows,
  onChangeBodyXml,
}: {
  headerRows: ToolParamRow[]
  bodyXml: string
  onChangeHeaderRows: (rows: ToolParamRow[]) => void
  onChangeBodyXml: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Headers" hint="Optional SOAP header values.">
        <ParamRowsTable rows={headerRows} onChange={onChangeHeaderRows} locationOptions={['header']} addLabel="Add header" />
      </Field>
      <Field label="Body (XML)" hint="The SOAP envelope/body template sent for this action.">
        <CodeEditor lang="xml" value={bodyXml} onChange={onChangeBodyXml} placeholder={'<soapenv:Envelope>\n  ...\n</soapenv:Envelope>'} />
      </Field>
    </div>
  )
}
