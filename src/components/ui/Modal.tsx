import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Reference-counted so a modal closing while another is still open (e.g. a delete-confirm
// stacked on top of an edit modal) doesn't prematurely re-enable the background app.
let openModalCount = 0

function acquireBackgroundLock() {
  openModalCount += 1
  document.body.style.overflow = 'hidden'
  const appRoot = document.getElementById('root')
  appRoot?.setAttribute('inert', '')
  return () => {
    openModalCount = Math.max(0, openModalCount - 1)
    if (openModalCount === 0) {
      document.body.style.overflow = ''
      appRoot?.removeAttribute('inert')
    }
  }
}

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

    // Marks the app behind the overlay inert. Without this, a select-all (Cmd/Ctrl+A) that
    // doesn't land inside a focused input falls through to the whole document, and the
    // blurred backdrop lets that background selection show through.
    const releaseBackgroundLock = acquireBackgroundLock()

    return () => {
      document.removeEventListener('keydown', onKey)
      releaseBackgroundLock()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
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
    </div>,
    document.body,
  )
}
