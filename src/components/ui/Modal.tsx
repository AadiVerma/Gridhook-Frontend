import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh] sm:pt-[10vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl border border-border-strong/15 bg-surface-raised shadow-2xl animate-fade-in',
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border/10 p-5">
            <div>
              {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-xs text-muted">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-faint transition-colors hover:bg-surface hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
