import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useAnnouncements } from '../../hooks/queries'
import { formatDate } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'

export function AlumniAnnouncements() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useAnnouncements({ page })

  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Pengumuman" subtitle="Informasi terbaru dari institusi Anda" />

      <Card>
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat pengumuman" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada pengumuman" description="Belum ada pengumuman dari institusi Anda." />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {rows.map((announcement) => (
                <article key={announcement.id} className="flex gap-4 px-5 py-5 transition-colors hover:bg-slate-50">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{announcement.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                      {announcement.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Dipublikasikan {formatDate(announcement.published_at)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
