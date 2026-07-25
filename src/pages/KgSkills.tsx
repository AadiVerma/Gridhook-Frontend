import { Sparkles, Zap } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { kgSkills } from '@/lib/mock-data'

export default function KgSkills() {
  return (
    <AppShell title="AI Skills" subtitle="Reusable multi-step routines learned from your knowledge graph" backTo="/knowledge-graph">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {kgSkills.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/10 text-violet">
                  <Sparkles size={16} />
                </span>
                <Badge tone={s.confidence > 0.85 ? 'ok' : s.confidence > 0.7 ? 'warn' : 'bad'}>
                  {Math.round(s.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="mt-3 font-mono text-sm font-semibold text-ink">{s.name}</p>
              <p className="mt-1.5 text-xs text-muted">{s.description}</p>
              <div className="mt-4 flex items-center gap-1.5 border-t border-border/10 pt-3 text-[11px] text-faint">
                <Zap size={11} /> used by {s.usedBy} agent sessions this week
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
