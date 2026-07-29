import { BackendEngineType } from './connectors-store'

export interface ToolParamRow {
  id: string
  name: string
  in: 'path' | 'query' | 'header'
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
}

export interface GraphQlVariableRow {
  id: string
  name: string
  type: string
  required: boolean
  description: string
}

export interface SoapHeaderRow {
  id: string
  name: string
  value: string
}

export type ToolParamsFormState =
  | { engineType: 'REST'; rows: ToolParamRow[]; bodyJson: string }
  | { engineType: 'GRAPHQL'; variables: GraphQlVariableRow[]; operationText: string }
  | { engineType: 'SOAP'; headerRows: SoapHeaderRow[]; bodyXml: string }
  | { engineType: 'RAW'; rawJson: string }

let rowIdCounter = 0
export function newRowId() {
  rowIdCounter += 1
  return `row-${rowIdCounter}`
}

export function createEmptyParamRow(base: Partial<ToolParamRow> = {}): ToolParamRow {
  return {
    id: newRowId(),
    name: '',
    in: 'query',
    type: 'string',
    required: false,
    description: '',
    ...base,
  }
}

export function createEmptyVariableRow(): GraphQlVariableRow {
  return { id: newRowId(), name: '', type: 'String', required: false, description: '' }
}

export function createEmptySoapHeaderRow(): SoapHeaderRow {
  return { id: newRowId(), name: '', value: '' }
}

export function createEmptyParamsState(engineType: BackendEngineType): ToolParamsFormState {
  if (engineType === 'GRAPHQL') return { engineType: 'GRAPHQL', variables: [], operationText: '' }
  if (engineType === 'SOAP') return { engineType: 'SOAP', headerRows: [], bodyXml: '' }
  return { engineType: 'REST', rows: [], bodyJson: '' }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toRow(raw: unknown): ToolParamRow {
  if (!isPlainObject(raw) || typeof raw.name !== 'string' || !raw.name) throw new Error('invalid param row')
  const inValue = raw.in === 'path' || raw.in === 'header' ? raw.in : 'query'
  const typeValue: ToolParamRow['type'] =
    raw.type === 'number' || raw.type === 'integer' || raw.type === 'boolean' || raw.type === 'object' || raw.type === 'array'
      ? raw.type
      : 'string'
  return {
    id: newRowId(),
    name: raw.name,
    in: inValue,
    type: typeValue,
    required: raw.required === true,
    description: typeof raw.description === 'string' ? raw.description : '',
  }
}

function toVariableRow(name: string, raw: unknown): GraphQlVariableRow {
  const obj = isPlainObject(raw) ? raw : {}
  const rawType = typeof obj.type === 'string' ? obj.type : 'String'
  const required = rawType.endsWith('!')
  return {
    id: newRowId(),
    name,
    type: required ? rawType.slice(0, -1) : rawType,
    required,
    description: typeof obj.description === 'string' ? obj.description : '',
  }
}

const placeholderPattern = /\{\{?([A-Za-z_][A-Za-z0-9_]*)\}\}?/g

function extractPlaceholders(body: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const match of body.matchAll(placeholderPattern)) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      names.push(match[1])
    }
  }
  return names
}

function schemaFromPlaceholders(names: string[]) {
  const properties: Record<string, unknown> = {}
  for (const name of names) properties[name] = { type: 'string' }
  return { type: 'object', properties, required: names }
}

export interface BuiltToolConfig {
  parameters: unknown
  endpointMapping?: Record<string, unknown>
}

export function buildToolParameters(state: ToolParamsFormState): BuiltToolConfig {
  switch (state.engineType) {
    case 'REST': {
      const parameters = state.rows.map((r) => ({
        name: r.name,
        in: r.in,
        type: r.type,
        required: r.required,
        description: r.description,
      }))
      const trimmedBody = state.bodyJson.trim()
      const payload: Record<string, unknown> = { parameters }
      if (trimmedBody) payload.body = JSON.parse(trimmedBody)
      return { parameters: payload }
    }
    case 'GRAPHQL': {
      const variables = Object.fromEntries(
        state.variables
          .filter((v) => v.name)
          .map((v) => [v.name, { type: v.required ? `${v.type}!` : v.type, description: v.description }]),
      )
      return { parameters: { query: state.operationText, variables } }
    }
    case 'SOAP': {
      const headers = Object.fromEntries(state.headerRows.filter((r) => r.name.trim()).map((r) => [r.name.trim(), r.value]))
      return {
        parameters: schemaFromPlaceholders(extractPlaceholders(state.bodyXml)),
        endpointMapping: { headers, envelopeTemplate: state.bodyXml },
      }
    }
    case 'RAW':
      return { parameters: state.rawJson.trim() ? JSON.parse(state.rawJson) : {} }
  }
}

function headerValueToString(v: unknown): string {
  if (typeof v === 'string') return v
  if (isPlainObject(v)) {
    for (const key of ['value', 'default', 'example']) {
      if (typeof v[key] === 'string') return v[key]
    }
  }
  return v === undefined || v === null ? '' : String(v)
}

export function parseToolParameters(engineType: BackendEngineType, raw: unknown, endpointMapping?: unknown): ToolParamsFormState {
  try {
    if (engineType === 'REST') {
      const obj = isPlainObject(raw) ? raw : {}
      if (obj.parameters !== undefined && !Array.isArray(obj.parameters)) throw new Error('shape mismatch')
      const rows = (Array.isArray(obj.parameters) ? obj.parameters : []).map(toRow)
      const bodyJson = obj.body !== undefined ? JSON.stringify(obj.body, null, 2) : ''
      return { engineType: 'REST', rows, bodyJson }
    }
    if (engineType === 'GRAPHQL') {
      const obj = isPlainObject(raw) ? raw : {}
      if (typeof obj.query !== 'string') throw new Error('shape mismatch')
      const variablesObj = isPlainObject(obj.variables) ? obj.variables : {}
      const variables = Object.entries(variablesObj).map(([name, v]) => toVariableRow(name, v))
      return { engineType: 'GRAPHQL', variables, operationText: obj.query }
    }
    if (engineType === 'SOAP') {
      // The live envelope/headers live in endpointMapping — parameters is just the
      // derived input schema. Fall back to the legacy parameters.{body,headers} shape
      // for tools saved before endpointMapping existed.
      const em = isPlainObject(endpointMapping) ? endpointMapping : {}
      const legacy = isPlainObject(raw) ? raw : {}
      const bodyXml = typeof em.envelopeTemplate === 'string' ? em.envelopeTemplate : typeof legacy.body === 'string' ? legacy.body : ''
      const headersObj = isPlainObject(em.headers) ? em.headers : isPlainObject(legacy.headers) ? legacy.headers : {}
      const headerRows = Object.entries(headersObj).map(([name, v]) => ({ id: newRowId(), name, value: headerValueToString(v) }))
      return { engineType: 'SOAP', headerRows, bodyXml }
    }
  } catch {
    // fall through to RAW below
  }
  return { engineType: 'RAW', rawJson: JSON.stringify(raw ?? {}, null, 2) }
}

export function isToolParamsValid(state: ToolParamsFormState): boolean {
  switch (state.engineType) {
    case 'REST': {
      if (state.rows.some((r) => !r.name.trim())) return false
      if (!state.bodyJson.trim()) return true
      try {
        JSON.parse(state.bodyJson)
        return true
      } catch {
        return false
      }
    }
    case 'GRAPHQL':
      return state.operationText.trim().length > 0 && !state.variables.some((v) => !v.name.trim())
    case 'SOAP':
      return state.bodyXml.trim().length > 0 && !state.headerRows.some((r) => !r.name.trim())
    case 'RAW': {
      if (!state.rawJson.trim()) return true
      try {
        JSON.parse(state.rawJson)
        return true
      } catch {
        return false
      }
    }
  }
}
