import clsx from 'clsx'

/**
 * Brand logo mark — white rounded square with navy school icon.
 * Matches the mobile splash screen style.
 */
export function Logo({
  className,
  alt = '',
}: {
  className?: string
  alt?: string
}) {
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-md',
        className
      )}
      role="img"
      aria-label={alt || 'TracerAlumni Logo'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[55%] w-[55%] text-indigo-800"
        aria-hidden="true"
      >
        <path
          d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}
