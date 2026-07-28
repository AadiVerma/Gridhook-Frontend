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

export type ToolParamsFormState =
  | { engineType: 'REST'; rows: ToolParamRow[]; bodyJson: string }
  | { engineType: 'GRAPHQL'; variables: GraphQlVariableRow[]; operationText: string }
  | { engineType: 'SOAP'; headerRows: ToolParamRow[]; bodyXml: string }
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

export function buildToolParameters(state: ToolParamsFormState): unknown {
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
      return payload
    }
    case 'GRAPHQL': {
      const variables = Object.fromEntries(
        state.variables
          .filter((v) => v.name)
          .map((v) => [v.name, { type: v.required ? `${v.type}!` : v.type, description: v.description }]),
      )
      return { query: state.operationText, variables }
    }
    case 'SOAP': {
      const headers = Object.fromEntries(
        state.headerRows
          .filter((r) => r.name)
          .map((r) => [r.name, { type: r.type, required: r.required, description: r.description }]),
      )
      return { headers, body: state.bodyXml }
    }
    case 'RAW':
      return state.rawJson.trim() ? JSON.parse(state.rawJson) : {}
  }
}

export function parseToolParameters(engineType: BackendEngineType, raw: unknown): ToolParamsFormState {
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
      const obj = isPlainObject(raw) ? raw : {}
      if (obj.body !== undefined && typeof obj.body !== 'string') throw new Error('shape mismatch')
      const headersObj = isPlainObject(obj.headers) ? obj.headers : {}
      const headerRows = Object.entries(headersObj).map(([name, v]) => toRow({ ...(isPlainObject(v) ? v : {}), name, in: 'header' }))
      return { engineType: 'SOAP', headerRows, bodyXml: typeof obj.body === 'string' ? obj.body : '' }
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
