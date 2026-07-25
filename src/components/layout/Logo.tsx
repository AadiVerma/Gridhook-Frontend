export function Logo({ size = 26 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-ink text-canvas font-bold"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <circle cx="6" cy="6" r="2.6" fill="currentColor" />
        <circle cx="18" cy="6" r="2.6" fill="currentColor" />
        <circle cx="12" cy="18" r="2.6" fill="currentColor" />
        <path d="M8 7.5L11 16M16 7.5L13 16M8.5 6H15.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </div>
  )
}
