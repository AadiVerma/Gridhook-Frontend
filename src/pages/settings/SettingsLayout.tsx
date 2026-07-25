import { NavLink, Outlet } from 'react-router-dom'
import { User, Building2, Users, ShieldCheck, KeyRound } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { cn } from '@/lib/utils'

const sections = [
  {
    label: 'Profile',
    items: [{ to: '/settings/profile', label: 'Profile', icon: User }],
  },
  {
    label: 'Organization',
    items: [
      { to: '/settings/organization', label: 'General', icon: Building2 },
      { to: '/settings/users', label: 'Users', icon: Users },
      { to: '/settings/roles', label: 'Roles', icon: ShieldCheck },
      { to: '/settings/license', label: 'License', icon: KeyRound },
    ],
  },
]

export default function SettingsLayout() {
  return (
    <AppShell title="Settings" subtitle="Manage your profile, organization, and access" maxWidth="1100px">
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="w-full shrink-0 space-y-5 lg:w-[210px]">
          {sections.map((s) => (
            <div key={s.label}>
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">{s.label}</p>
              <div className="space-y-0.5">
                {s.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        isActive ? 'bg-signal/10 text-ink font-medium' : 'text-muted hover:bg-surface-raised/60 hover:text-ink',
                      )
                    }
                  >
                    <item.icon size={15} className="text-faint" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </AppShell>
  )
}
