import { Field } from '@/components/ui/Input'
import { KeyValueRowsTable } from './KeyValueRowsTable'
import { CodeEditor } from './CodeEditor'
import { SoapHeaderRow } from '@/lib/tool-params'

export function SoapParamsEditor({
  headerRows,
  bodyXml,
  onChangeHeaderRows,
  onChangeBodyXml,
}: {
  headerRows: SoapHeaderRow[]
  bodyXml: string
  onChangeHeaderRows: (rows: SoapHeaderRow[]) => void
  onChangeBodyXml: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Headers" hint="Request headers sent with this SOAP call, e.g. SOAPAction.">
        <KeyValueRowsTable rows={headerRows} onChange={onChangeHeaderRows} addLabel="Add header" />
      </Field>
      <Field label="Body (XML)" hint="The SOAP envelope template sent for this action. Use {PLACEHOLDER} for tool arguments.">
        <CodeEditor lang="xml" value={bodyXml} onChange={onChangeBodyXml} placeholder={'<soapenv:Envelope>\n  ...\n</soapenv:Envelope>'} />
      </Field>
    </div>
  )
}
