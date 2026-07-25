import { ButtonHTMLAttributes, cloneElement, forwardRef, isValidElement } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-signal text-white font-medium hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_rgb(var(--signal)/0.5)]',
  secondary:
    'bg-surface-raised text-ink border border-border-strong/20 hover:bg-surface-raised/70 hover:border-border-strong/40',
  ghost: 'text-muted hover:text-ink hover:bg-surface-raised/60',
  danger: 'bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20',
  outline: 'border border-signal/50 text-signal hover:bg-signal/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'secondary', size = 'md', asChild, children, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center whitespace-nowrap transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none',
      variants[variant],
      sizes[size],
      className,
    )

    if (asChild && isValidElement(children)) {
      const child = children as React.ReactElement<any>
      return cloneElement(child, {
        className: cn(classes, child.props.className),
        ref,
        ...props,
      })
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
