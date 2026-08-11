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
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: LucideIcon
  tone?: keyof typeof TONES
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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
