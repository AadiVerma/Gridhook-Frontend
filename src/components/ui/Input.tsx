import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-border-strong/15 bg-canvas/40 px-3 text-sm text-ink placeholder:text-faint outline-none transition-colors',
        'focus:border-signal/50 focus:ring-2 focus:ring-signal/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border-strong/15 bg-canvas/40 px-3 py-2 text-sm text-ink placeholder:text-faint outline-none transition-colors',
        'focus:border-signal/50 focus:ring-2 focus:ring-signal/15',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-border-strong/15 bg-canvas/40 px-3 text-sm text-ink outline-none transition-colors appearance-none',
        'focus:border-signal/50 focus:ring-2 focus:ring-signal/15',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-muted mb-1.5 block', className)} {...props} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-faint">{hint}</p>}
    </div>
  )
}
