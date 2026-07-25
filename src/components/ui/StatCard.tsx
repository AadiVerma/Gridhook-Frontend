import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendTone = 'ok',
  sub,
}: {
  label: string
  value: string
  icon: ReactNode
  trend?: string
  trendTone?: 'ok' | 'bad' | 'neutral'
  sub?: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-signal">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink font-mono">{value}</span>
        {trend && (
          <span
            className={cn('text-xs font-medium', {
              'text-ok': trendTone === 'ok',
              'text-bad': trendTone === 'bad',
              'text-muted': trendTone === 'neutral',
            })}
          >
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[11px] text-faint">{sub}</p>}
    </Card>
  )
}
