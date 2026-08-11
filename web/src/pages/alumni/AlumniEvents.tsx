import { useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { useEvents } from '../../hooks/queries'
import { formatDate } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'

export function AlumniEvents() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useEvents({ upcoming: true, page })

  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Acara" subtitle="Agenda dan kegiatan alumni yang akan datang" />

      <Card>
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat acara" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada acara" description="Belum ada acara yang dijadwalkan institusi Anda." />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {rows.map((event) => {
                const start = event.starts_at ? new Date(event.starts_at) : null
                return (
                  <article key={event.id} className="flex gap-4 px-5 py-5 transition-colors hover:bg-slate-50">
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 py-2">
                      {start ? (
                        <>
                          <span className="text-[10px] font-semibold tracking-wide text-indigo-500 uppercase">
                            {start.toLocaleDateString('id-ID', { month: 'short' })}
                          </span>
                          <span className="text-xl font-bold text-indigo-700">{start.getDate()}</span>
                        </>
                      ) : (
                        <CalendarDays className="size-5 text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900">{event.title}</h2>
                      {event.description && (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{event.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {event.starts_at && (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-indigo-400" />
                            {formatDate(event.starts_at)}
                            {event.ends_at ? ` – ${formatDate(event.ends_at)}` : ''}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-indigo-400" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
