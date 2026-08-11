import clsx from 'clsx'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
