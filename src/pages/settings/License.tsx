import { KeyRound, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const perks = ['Unlimited connectors', 'Unlimited MCP servers', 'Knowledge graph + AI skills', 'Priority support']

export default function License() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>License</CardTitle>
          <CardDescription>Your current plan and activation status.</CardDescription>
        </div>
        <Badge tone="ok">Commercial — active</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-border-strong/15 bg-canvas/40 p-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
            <KeyRound size={15} />
          </span>
          <div>
            <p className="font-mono text-sm text-ink">GRID-XXXX-XXXX-7F2A</p>
            <p className="text-[11px] text-faint">Renews 2027-01-14 · seats 25 / 50 used</p>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-xs text-muted">
              <Check size={13} className="text-ok" /> {p}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
          <Button variant="secondary" size="sm">
            Manage billing
          </Button>
          <Button variant="primary" size="sm">
            Upgrade seats
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
