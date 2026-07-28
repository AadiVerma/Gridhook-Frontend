import { ToolParamsFormState } from '@/lib/tool-params'
import { Tool } from '@/lib/connector-api'
import { BackendEngineType } from '@/lib/connectors-store'
import { RestParamsEditor } from './RestParamsEditor'
import { GraphQlParamsEditor } from './GraphQlParamsEditor'
import { SoapParamsEditor } from './SoapParamsEditor'
import { RawFallbackEditor } from './RawFallbackEditor'

export function ToolParamsEditor({
  state,
  onChange,
  method,
  engineType,
}: {
  state: ToolParamsFormState
  onChange: (state: ToolParamsFormState) => void
  method?: Tool['method']
  engineType: BackendEngineType
}) {
  if (state.engineType === 'RAW') {
    return (
      <RawFallbackEditor
        engineType={engineType}
        rawJson={state.rawJson}
        onChangeRawJson={(rawJson) => onChange({ ...state, rawJson })}
        onReset={onChange}
      />
    )
  }

  if (state.engineType === 'REST') {
    return (
      <RestParamsEditor
        rows={state.rows}
        bodyJson={state.bodyJson}
        showBody={method !== 'GET'}
        onChangeRows={(rows) => onChange({ ...state, rows })}
        onChangeBody={(bodyJson) => onChange({ ...state, bodyJson })}
      />
    )
  }

  if (state.engineType === 'GRAPHQL') {
    return (
      <GraphQlParamsEditor
        operationText={state.operationText}
        variables={state.variables}
        onChangeOperationText={(operationText) => onChange({ ...state, operationText })}
        onChangeVariables={(variables) => onChange({ ...state, variables })}
      />
    )
  }

  return (
    <SoapParamsEditor
      headerRows={state.headerRows}
      bodyXml={state.bodyXml}
      onChangeHeaderRows={(headerRows) => onChange({ ...state, headerRows })}
      onChangeBodyXml={(bodyXml) => onChange({ ...state, bodyXml })}
    />
  )
}
