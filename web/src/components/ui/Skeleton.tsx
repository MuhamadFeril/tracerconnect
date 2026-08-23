import { useEffect, useRef } from 'react'

export function Skeleton({ className }: { className?: string }) {
  const styleRef = useRef<HTMLStyleElement>(null)

  useEffect(() => {
    if (styleRef.current) return
    const style = document.createElement('style')
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `
    document.head.appendChild(style)
    styleRef.current = style
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current)
        styleRef.current = null
      }
    }
  }, [])

  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}