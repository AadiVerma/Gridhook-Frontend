import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { api, ApiError } from './api-client'
import { useAuth } from './auth-store'
import { ApiStatus } from './mock-data'

// Matches the flat aggregate shape the real backend returns for GET /connectors —
// unlike the connector-drafts store, there's no nested modules/apis here: the
// backend has no "module" grouping concept, just per-connector rollup counts.
export type BackendEngineType = 'REST' | 'GRAPHQL' | 'SOAP'
export type BackendAuthType = 'oauth2' | 'bearer' | 'api_key' | 'basic' | 'login_token' | 'none'

export interface ConnectorListItem {
  id: number
  name: string
  glyph: string
  description: string
  engineTypes: BackendEngineType[]
  authTypes: BackendAuthType[]
  apiCount: number
  toolCount: number
  moduleCount: number
  status: ApiStatus
  lastSync: string | null
}

interface ConnectorsPage {
  data: ConnectorListItem[]
  page: number
  pageSize: number
  total: number
}

interface ConnectorsStore {
  connectors: ConnectorListItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  toggleConnector: (id: number, active: boolean) => Promise<void>
  deleteConnector: (id: number) => Promise<void>
  runHealthCheck: (id: number) => Promise<void>
}

const ConnectorsContext = createContext<ConnectorsStore | null>(null)

export function ConnectorsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [connectors, setConnectors] = useState<ConnectorListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnectors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ConnectorsPage>('/connectors')
      setConnectors(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load connectors. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Gate on auth status — this provider wraps the whole app (including /login), so
  // fetching unconditionally would fire an unauthenticated request on every page load
  // and its 401 would trip the global unauthorized handler, clobbering a token that's
  // mid-flight from a fresh login.
  useEffect(() => {
    if (status !== 'authenticated') {
      setConnectors([])
      setError(null)
      setLoading(status === 'loading')
      return
    }
    fetchConnectors()
  }, [status, fetchConnectors])

  function replaceConnector(updated: ConnectorListItem) {
    setConnectors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  async function toggleConnector(id: number, active: boolean) {
    const updated = await api.post<ConnectorListItem>(`/connectors/${id}/toggle`, { active })
    replaceConnector(updated)
  }

  async function deleteConnector(id: number) {
    await api.delete(`/connectors/${id}`)
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }

  async function runHealthCheck(id: number) {
    const updated = await api.post<ConnectorListItem>(`/connectors/${id}/health-check`)
    replaceConnector(updated)
  }

  return (
    <ConnectorsContext.Provider
      value={{ connectors, loading, error, refetch: fetchConnectors, toggleConnector, deleteConnector, runHealthCheck }}
    >
      {children}
    </ConnectorsContext.Provider>
  )
}

export function useConnectorsStore() {
  const ctx = useContext(ConnectorsContext)
  if (!ctx) throw new Error('useConnectorsStore must be used within ConnectorsProvider')
  return ctx
}
