import { useState } from 'react'
import clsx from 'clsx'

/**
 * Brand logo mark (custom SVG badge). The badge already carries its own
 * gradient background and rounded corners, so callers only size it.
 *
 * Defaults to decorative alt text (alt="") because every usage site shows the
 * "TracerConnect" wordmark right next to it — pass a real `alt` only when the
 * mark stands alone.
 */
export function Logo({
  className,
  alt = '',
}: {
  className?: string
  alt?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <img
      src="/logo.svg"
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className={clsx('block shrink-0 select-none', className)}
    />
  )
}
