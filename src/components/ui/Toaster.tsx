import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      offset={16}
      toastOptions={{
        style: {
          background: 'rgb(var(--surface))',
          color: 'rgb(var(--ink))',
          border: '1px solid rgb(var(--border-strong) / 0.15)',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 24px -12px rgb(0 0 0 / 0.6)',
          fontSize: '0.8125rem',
          padding: '0.625rem 0.75rem',
        },
      }}
      className="toaster group"
      richColors
    />
  )
}
