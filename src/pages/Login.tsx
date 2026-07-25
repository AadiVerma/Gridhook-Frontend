import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, KeyRound, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('aditya.verma@procol.in')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => navigate('/'), 650)
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

          <form className="space-y-3.5" onSubmit={submit}>
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
                <Input placeholder="Aditya Verma" required />
              </div>
            )}
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-muted">Password</label>
                {mode === 'signin' && (
                  <button type="button" className="text-[11px] text-signal hover:underline">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input type="password" className="pl-8" placeholder="••••••••••" required />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="mt-1 w-full justify-center" disabled={loading}>
              {loading ? (
                'Verifying…'
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-strong/10" />
            <span className="text-[11px] text-faint">or continue with</span>
            <div className="h-px flex-1 bg-border-strong/10" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => navigate('/')} type="button">
              <Github size={15} /> GitHub
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')} type="button">
              <KeyRound size={15} /> SSO
            </Button>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
          <ShieldCheck size={12} /> Self-hosted. Your credentials never leave this instance.
        </p>
      </div>
    </div>
  )
}
