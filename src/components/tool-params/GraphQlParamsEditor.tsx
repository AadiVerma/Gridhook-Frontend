import { Field } from '@/components/ui/Input'
import { GraphQlVariablesTable } from './GraphQlVariablesTable'
import { CodeEditor } from './CodeEditor'
import { GraphQlVariableRow } from '@/lib/tool-params'

export function GraphQlParamsEditor({
  operationText,
  variables,
  onChangeOperationText,
  onChangeVariables,
}: {
  operationText: string
  variables: GraphQlVariableRow[]
  onChangeOperationText: (value: string) => void
  onChangeVariables: (rows: GraphQlVariableRow[]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Query / mutation" hint="The GraphQL operation this tool sends.">
        <CodeEditor lang="graphql" value={operationText} onChange={onChangeOperationText} placeholder={'query getCustomerBalance($id: ID!) {\n  customer(id: $id) {\n    balance\n  }\n}'} />
      </Field>
      <Field label="Variables" hint="Variables referenced in the operation above.">
        <GraphQlVariablesTable rows={variables} onChange={onChangeVariables} />
      </Field>
    </div>
  )
}
