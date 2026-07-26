import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { api, ApiError, getAccessToken, setAccessToken, onUnauthorized } from './api-client'

export interface AuthUser {
  id: string
  name: string
  email: string
  organizationId: number
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer'
  status: 'active' | 'invited'
  lastActive: string
}

export interface AuthOrg {
  id: number
  name: string
  slug: string
}

export interface OrgChoice {
  id: number
  name: string
  slug: string
  role: string
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type LoginResult = { status: 'authenticated' } | { status: 'select-organization'; organizations: OrgChoice[] }

interface LoginResponse {
  token: string
  user: AuthUser
}

interface OrgSelectionResponse {
  organizations: OrgChoice[]
}

interface MeResponse {
  user: AuthUser
  org: AuthOrg
}

interface AuthStore {
  status: AuthStatus
  user: AuthUser | null
  org: AuthOrg | null
  error: string | null
  login: (email: string, password: string, organizationId?: number) => Promise<LoginResult>
  register: (name: string, email: string, password: string, orgName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthStore | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [org, setOrg] = useState<AuthOrg | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setOrg(null)
    setStatus('unauthenticated')
  }, [])

  const hydrateSession = useCallback(async (token?: string) => {
    if (token) setAccessToken(token)
    const me = await api.get<MeResponse>('/auth/me')
    setUser(me.user)
    setOrg(me.org)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    onUnauthorized(clearSession)
  }, [clearSession])

  useEffect(() => {
    if (!getAccessToken()) {
      setStatus('unauthenticated')
      return
    }
    hydrateSession().catch(clearSession)
  }, [clearSession, hydrateSession])

  async function login(email: string, password: string, organizationId?: number): Promise<LoginResult> {
    setError(null)
    try {
      const body = organizationId ? { email, password, organizationId } : { email, password }
      const res = await api.post<LoginResponse | OrgSelectionResponse>('/auth/login', body)

      if ('organizations' in res) {
        return { status: 'select-organization', organizations: res.organizations }
      }

      await hydrateSession(res.token)
      return { status: 'authenticated' }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.')
      throw err
    }
  }

  async function register(name: string, email: string, password: string, orgName: string) {
    setError(null)
    try {
      const res = await api.post<LoginResponse>('/auth/register', { name, email, password, orgName })
      await hydrateSession(res.token)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account. Please try again.')
      throw err
    }
  }

  function logout() {
    api.post('/auth/logout').catch(() => {})
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ status, user, org, error, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
