import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
} as const

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'indigo',
  delay = 0,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: LucideIcon
  tone?: keyof typeof TONES
  /** Entrance animation delay in ms (used for staggered card entrances). */
  delay?: number
}) {
  return (
    <div
      className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}
