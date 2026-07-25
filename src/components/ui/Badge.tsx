import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'signal' | 'ok' | 'warn' | 'bad' | 'info' | 'violet' | 'neutral'

const toneClasses: Record<Tone, string> = {
  signal: 'bg-signal/10 text-signal border-signal/25',
  ok: 'bg-ok/10 text-ok border-ok/25',
  warn: 'bg-warn/10 text-warn border-warn/25',
  bad: 'bg-bad/10 text-bad border-bad/25',
  info: 'bg-info/10 text-info border-info/25',
  violet: 'bg-violet/10 text-violet border-violet/25',
  neutral: 'bg-faint/10 text-muted border-border-strong/15',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  dot?: boolean
}

export function StatusPill({ className, tone = 'neutral', dot = true, children, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-signal': tone === 'signal',
            'bg-ok animate-pulse-dot': tone === 'ok',
            'bg-warn': tone === 'warn',
            'bg-bad': tone === 'bad',
            'bg-info': tone === 'info',
            'bg-violet': tone === 'violet',
            'bg-faint': tone === 'neutral',
          })}
        />
      )}
      {children}
    </span>
  )
}
