import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '../../lib/types'
import { Button } from './Button'

export function Pagination({
  meta,
  onPageChange,
}: {
  meta?: PaginationMeta
  onPageChange: (page: number) => void
}) {
  if (!meta || meta.last_page <= 1) return null

  const { current_page, last_page, total, per_page } = meta
  const from = (current_page - 1) * per_page + 1
  const to = Math.min(current_page * per_page, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> dari{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
        >
          <ChevronLeft className="size-4" />
          Sebelumnya
        </Button>
        <span className="px-2 text-xs font-medium text-slate-600">
          {current_page} / {last_page}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
        >
          Berikutnya
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
