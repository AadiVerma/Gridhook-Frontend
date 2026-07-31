const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_PREFIX = '/api/v1'
const TOKEN_STORAGE_KEY = 'gridhook_access_token'

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set — copy .env.example to .env and configure it.')
}

export class ApiError extends Error {
  status: number
  code: string
  field?: string
  /** Server-side correlation id from the error envelope — the only handle support has, so surface it in error UI. */
  requestId?: string

  constructor(status: number, code: string, message: string, field?: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
    this.requestId = requestId
  }
}

let accessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY)
let unauthorizedHandler: (() => void) | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/** Called whenever a request comes back 401, so the auth store can clear session state in one place. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Send as-is instead of JSON.stringify-ing — for endpoints that read the raw request body (e.g. spec import). */
  rawBody?: string
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, rawBody, signal } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (res.status === 401) unauthorizedHandler?.()

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    const err = data?.error
    throw new ApiError(res.status, err?.code ?? 'unknown_error', err?.message ?? res.statusText, err?.field, err?.requestId)
  }

  return data as T
}

/** For endpoints that return a file rather than JSON (e.g. audit-log CSV export). */
async function requestBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, { headers })

  if (res.status === 401) unauthorizedHandler?.()

  if (!res.ok) {
    // A failure still comes back as the usual JSON envelope, not a file.
    let code = 'unknown_error'
    let message = res.statusText
    let requestId: string | undefined
    try {
      const err = JSON.parse(await res.text())?.error
      code = err?.code ?? code
      message = err?.message ?? message
      requestId = err?.requestId
    } catch {
      // non-JSON body — keep the status text
    }
    throw new ApiError(res.status, code, message, undefined, requestId)
  }

  return res.blob()
}

export const api = {
  get: <T,>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T,>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T,>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T,>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'DELETE' }),
  postRaw: <T,>(path: string, rawBody: string, options?: Omit<RequestOptions, 'method' | 'body' | 'rawBody'>) =>
    request<T>(path, { ...options, method: 'POST', rawBody }),
  getBlob: (path: string) => requestBlob(path),
}

/** Uniform message for error UI — includes the requestId when the server sent one. */
export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.requestId ? `${err.message} (request ${err.requestId})` : err.message
  return fallback
}
