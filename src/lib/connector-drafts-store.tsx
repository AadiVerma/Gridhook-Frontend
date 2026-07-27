import { createContext, useContext, useState, ReactNode } from 'react'
import { initialConnectors, Connector, Module, Api, ApiStatus } from './mock-data'

// Local-only CRUD for the connector detail/create pages. The real backend has no
// "module" grouping concept (connectors just have a flat list of APIs/tools), so
// until those pages are redesigned around that flatter shape they keep operating
// on this in-memory draft, decoupled from the real API-backed list in connectors-store.
interface ConnectorDraftsStore {
  connectors: Connector[]
  addConnector: (c: Connector) => void
  deleteConnector: (id: string) => void
  setConnectorApisStatus: (connectorId: string, status: ApiStatus, touchLastSync?: boolean) => void
  setApiStatus: (connectorId: string, apiId: string, status: ApiStatus) => void
  updateApi: (connectorId: string, apiId: string, patch: Partial<Omit<Api, 'id' | 'moduleId'>>) => void
  moveApi: (connectorId: string, apiId: string, targetModuleId: string) => void
  addModule: (connectorId: string, module: Module) => void
  addApi: (connectorId: string, moduleId: string, api: Api) => void
}

const ConnectorDraftsContext = createContext<ConnectorDraftsStore | null>(null)

export function ConnectorDraftsProvider({ children }: { children: ReactNode }) {
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors)

  function mapConnector(connectorId: string, fn: (c: Connector) => Connector) {
    setConnectors((prev) => prev.map((c) => (c.id === connectorId ? fn(c) : c)))
  }

  function addConnector(c: Connector) {
    setConnectors((prev) => [c, ...prev])
  }

  function deleteConnector(id: string) {
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }

  function setConnectorApisStatus(connectorId: string, status: ApiStatus, touchLastSync = false) {
    mapConnector(connectorId, (c) => ({
      ...c,
      modules: c.modules.map((m) => ({
        ...m,
        apis: m.apis.map((a) => ({ ...a, status, ...(touchLastSync ? { lastSync: new Date().toISOString() } : {}) })),
      })),
    }))
  }

  function setApiStatus(connectorId: string, apiId: string, status: ApiStatus) {
    mapConnector(connectorId, (c) => ({
      ...c,
      modules: c.modules.map((m) => ({ ...m, apis: m.apis.map((a) => (a.id === apiId ? { ...a, status } : a)) })),
    }))
  }

  function updateApi(connectorId: string, apiId: string, patch: Partial<Omit<Api, 'id' | 'moduleId'>>) {
    mapConnector(connectorId, (c) => ({
      ...c,
      modules: c.modules.map((m) => ({ ...m, apis: m.apis.map((a) => (a.id === apiId ? { ...a, ...patch } : a)) })),
    }))
  }

  function moveApi(connectorId: string, apiId: string, targetModuleId: string) {
    mapConnector(connectorId, (c) => {
      const api = c.modules.flatMap((m) => m.apis).find((a) => a.id === apiId)
      if (!api || api.moduleId === targetModuleId) return c
      const movedApi = { ...api, moduleId: targetModuleId }
      return {
        ...c,
        modules: c.modules.map((m) => {
          if (m.id === api.moduleId) return { ...m, apis: m.apis.filter((a) => a.id !== apiId) }
          if (m.id === targetModuleId) return { ...m, apis: [...m.apis, movedApi] }
          return m
        }),
      }
    })
  }

  function addModule(connectorId: string, module: Module) {
    mapConnector(connectorId, (c) => ({ ...c, modules: [...c.modules, module] }))
  }

  function addApi(connectorId: string, moduleId: string, api: Api) {
    mapConnector(connectorId, (c) => ({
      ...c,
      modules: c.modules.map((m) => (m.id === moduleId ? { ...m, apis: [...m.apis, api] } : m)),
    }))
  }

  return (
    <ConnectorDraftsContext.Provider
      value={{ connectors, addConnector, deleteConnector, setConnectorApisStatus, setApiStatus, updateApi, moveApi, addModule, addApi }}
    >
      {children}
    </ConnectorDraftsContext.Provider>
  )
}

export function useConnectorDrafts() {
  const ctx = useContext(ConnectorDraftsContext)
  if (!ctx) throw new Error('useConnectorDrafts must be used within ConnectorDraftsProvider')
  return ctx
}
