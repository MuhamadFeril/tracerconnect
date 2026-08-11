import clsx from 'clsx'
import { EMPLOYMENT_LABELS } from '../../lib/format'

export type BadgeTone = 'green' | 'amber' | 'rose' | 'indigo' | 'slate' | 'sky' | 'violet'

const TONES: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    published: { label: 'Published', tone: 'green' },
    draft: { label: 'Draft', tone: 'slate' },
    closed: { label: 'Ditutup', tone: 'rose' },
    in_progress: { label: 'Draft', tone: 'amber' },
    submitted: { label: 'Selesai', tone: 'green' },
    expired: { label: 'Kedaluwarsa', tone: 'rose' },
  }
  const entry = map[status]
  if (!entry) return <Badge>{status}</Badge>

  return <Badge tone={entry.tone}>{entry.label}</Badge>
}

export function EmploymentBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>
  const tone: Record<string, BadgeTone> = {
    working: 'green',
    unemployed: 'rose',
    entrepreneur: 'sky',
    continuing_study: 'violet',
  }
  return <Badge tone={tone[status] ?? 'slate'}>{EMPLOYMENT_LABELS[status] ?? status}</Badge>
}
