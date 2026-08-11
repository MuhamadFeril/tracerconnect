import clsx from 'clsx'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50">
      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={clsx('px-4 py-3 font-semibold', className)}>{children}</th>
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 align-middle text-slate-700', className)}>{children}</td>
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
}

export function TRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={clsx('transition-colors hover:bg-slate-50/70', className)}>{children}</tr>
}
