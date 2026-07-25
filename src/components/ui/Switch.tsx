import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border p-0 transition-colors duration-150',
        checked ? 'bg-signal/90 border-signal' : 'bg-surface-raised border-border-strong/20',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-150',
          checked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-faint',
        )}
      />
    </button>
  )
}
