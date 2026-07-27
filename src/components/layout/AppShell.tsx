import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Menu, Moon, Sun, Search } from 'lucide-react'
import { Sidebar, MobileSidebar } from './Sidebar'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function AppShell({
  title,
  subtitle,
  backTo,
  actions,
  children,
  maxWidth = '1180px',
}: {
  title: string
  subtitle?: string
  backTo?: string
  actions?: ReactNode
  children: ReactNode
  maxWidth?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useTheme()

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/10 bg-canvas/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border-strong/15 p-2 text-muted hover:text-ink lg:hidden"
            >
              <Menu size={16} />
            </button>

            <div className="min-w-0 flex-1">
              {backTo && (
                <Link
                  to={backTo}
                  className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-faint hover:text-signal"
                >
                  <ArrowLeft size={12} /> Back
                </Link>
              )}
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h1>
              </div>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>

            <div className="hidden items-center md:flex">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  placeholder="Search…"
                  className="h-8 w-52 rounded-lg border border-border-strong/15 bg-surface pl-8 pr-2 text-xs text-ink placeholder:text-faint outline-none focus:border-signal/40"
                />
              </div>
            </div>

            <button
              onClick={toggle}
              className="rounded-lg border border-border-strong/15 p-2 text-muted transition-colors hover:text-ink"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className={cn('mx-auto w-full')} style={{ maxWidth }}>
            {children}
          </div>
        </main>

        <footer className="border-t border-border/10 px-6 py-4 text-center text-[11px] text-faint">
          Gridhook — self-hosted MCP gateway.
        </footer>
      </div>
    </div>
  )
}
