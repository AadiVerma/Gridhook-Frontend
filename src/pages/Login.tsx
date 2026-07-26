import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Building2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useAuth, OrgChoice } from '@/lib/auth-store'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, login, register } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgChoices, setOrgChoices] = useState<OrgChoice[] | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true })
  }, [status, from, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your full name to proceed')
      return
    }

    if (mode === 'signup' && !orgName.trim()) {
      toast.error('Please enter your organization name to proceed')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter your email address to proceed')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!password) {
      toast.error('Please enter your password to proceed')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (mode === 'signup' && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      toast.error('Password must contain at least one special character')
      return
    }

    if (mode === 'signup' && !/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter')
      return
    }

    if (mode === 'signup' && !/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter')
      return
    }

    if (mode === 'signup' && !/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        const result = await login(email, password)
        if (result.status === 'select-organization') {
          setOrgChoices(result.organizations)
          return
        }
        toast.success('Signed in successfully')
      } else {
        await register(name, email, password, orgName)
        toast.success('Account created successfully')
      }
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function chooseOrganization(org: OrgChoice) {
    setLoading(true)
    try {
      await login(email, password, org.id)
      toast.success(`Signed in to ${org.name}`)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4">
      <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-signal/10 blur-[120px]" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={40} />
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">Welcome to Gridhook</h1>
          <p className="mt-1 text-sm text-muted">The self-hosted gateway from API to AI tool.</p>
        </div>

        <div className="rounded-2xl border border-border-strong/15 bg-surface p-6 shadow-panel">
          {orgChoices ? (
            <div className="animate-fade-in">
              <button
                onClick={() => setOrgChoices(null)}
                className="mb-4 flex items-center gap-1 text-[11px] font-medium text-faint hover:text-ink"
              >
                <ArrowLeft size={12} /> Back
              </button>
              <p className="mb-1 text-sm font-semibold text-ink">Choose an organization</p>
              <p className="mb-4 text-xs text-muted">Your account belongs to more than one workspace.</p>
              <div className="space-y-2">
                {orgChoices.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    disabled={loading}
                    onClick={() => chooseOrganization(org)}
                    className="flex w-full items-center justify-between rounded-lg border border-border-strong/15 bg-canvas/40 px-3.5 py-2.5 text-left transition-colors hover:border-signal/40 hover:bg-signal/5 disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{org.name}</span>
                      <span className="block truncate text-[11px] text-faint">{org.slug}</span>
                    </span>
                    <span className="ml-2 shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium capitalize text-muted">
                      {org.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5 flex rounded-lg border border-border-strong/15 bg-canvas/50 p-1 text-sm">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex-1 rounded-md py-1.5 font-medium transition-colors',
                      mode === m ? 'bg-signal text-white' : 'text-muted hover:text-ink',
                    )}
                  >
                    {m === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} noValidate>
                <div className="space-y-3.5">
                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                      mode === 'signup' ? 'max-h-[220px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-3.5 pb-3.5">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
                        <div className="relative">
                          <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-8"
                            placeholder="Aditya Verma"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Organization name</label>
                        <div className="relative">
                          <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                          <Input
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="pl-8"
                            placeholder="ARK"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Work email</label>
                    <div className="relative">
                      <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-8"
                        placeholder="you@company.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
                    <div className="relative">
                      <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-8"
                        placeholder="••••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" className="mt-4 w-full justify-center" disabled={loading}>
                  {loading ? (
                    'Verifying…'
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
          <ShieldCheck size={12} /> Self-hosted. Your credentials never leave this instance.
        </p>
      </div>
    </div>
  )
}
