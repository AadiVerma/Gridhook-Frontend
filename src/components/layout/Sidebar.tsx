import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  ScrollText,
  Plug,
  Store,
  Server,
  Waypoints,
  Sparkles,
  Rocket,
  Settings,
  ChevronsUpDown,
  LogOut,
  X,
} from 'lucide-react'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-store'
import { useState } from 'react'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

const groups = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/logs', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    label: 'Build',
    items: [
      { to: '/connectors', label: 'Connectors', icon: Plug, end: true },
      { to: '/connectors/store', label: 'Marketplace', icon: Store },
      { to: '/mcp-servers', label: 'MCP Servers', icon: Server },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/knowledge-graph', label: 'Knowledge Graph', icon: Waypoints, end: true },
      { to: '/knowledge-graph/skills', label: 'AI Skills', icon: Sparkles },
    ],
  },
  {
    label: 'Get started',
    items: [{ to: '/welcome', label: 'Setup guide', icon: Rocket }],
  },
]

function NavItem({ to, label, icon: Icon, end, onNavigate }: any) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
          isActive
            ? 'bg-signal/10 text-ink font-medium shadow-[inset_0_0_0_1px_rgb(var(--signal)/0.25)]'
            : 'text-muted hover:bg-surface-raised/60 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={cn(isActive ? 'text-signal' : 'text-faint group-hover:text-muted')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { user, org, logout } = useAuth()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Logo />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-ink">Gridhook</p>
          <p className="text-[10px] uppercase tracking-widest text-faint">MCP Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/10 p-3">
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-raised/60"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-signal to-violet text-[11px] font-bold text-white">
              {initials(user?.name ?? org?.name ?? 'Workspace')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{org?.name ?? 'Workspace'}</span>
              <span className="block truncate text-[10px] text-faint">{user?.email ?? ''}</span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-faint" />
          </button>
          {switcherOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-border-strong/15 bg-surface-raised p-1 shadow-2xl animate-fade-in">
              <NavItem to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
              <button
                onClick={() => {
                  setSwitcherOpen(false)
                  logout()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-canvas/60 hover:text-bad"
              >
                <LogOut size={16} className="text-faint" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/10 bg-surface/60 lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  )
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative h-full w-72 bg-surface shadow-2xl animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-3 top-4 rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink"
        >
          <X size={18} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  )
}
