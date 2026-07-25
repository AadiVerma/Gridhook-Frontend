import { ShieldCheck, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { roles } from '@/lib/mock-data'

export default function Roles() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Roles</CardTitle>
          <CardDescription>System roles and their permissions scope.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border/10 pt-4">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-signal">
              <ShieldCheck size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm text-ink">
                {r.name}
                {r.system && <Lock size={11} className="text-faint" />}
              </p>
              <p className="truncate text-[11px] text-faint">{r.description}</p>
            </div>
            <Badge tone="neutral">{r.members} members</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
