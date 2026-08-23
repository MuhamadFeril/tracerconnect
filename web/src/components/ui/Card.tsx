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
  icon: Icon,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-slate-500" />}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('p-5', className)}>{children}</div>
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('flex items-center gap-2 border-t border-slate-100 px-5 py-4', className)}>{children}</div>
}
