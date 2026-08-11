import { useState } from 'react'
import { ArrowUpRight, Briefcase, MapPin } from 'lucide-react'
import { useJobVacancies } from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'

const TYPE_TONES: Record<string, 'indigo' | 'sky' | 'violet' | 'amber' | 'slate'> = {
  full_time: 'indigo',
  part_time: 'sky',
  internship: 'violet',
  contract: 'amber',
  freelance: 'slate',
}

export function AlumniJobs() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useJobVacancies({ page })

  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Lowongan Kerja" subtitle="Peluang karier yang dikurasi institusi untuk alumni" />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat lowongan" onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada lowongan" description="Belum ada lowongan kerja dari institusi Anda." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map((job) => (
              <Card key={job.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
                    {(job.company_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">{job.title}</h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{job.company_name}</p>
                  </div>
                </div>

                {job.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{job.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {job.employment_type && (
                    <Badge tone={TYPE_TONES[job.employment_type] ?? 'slate'}>
                      {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                    </Badge>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="size-3.5" /> {job.location}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    {job.posted_at ? `Diposting ${formatDate(job.posted_at)}` : 'Baru diposting'}
                  </span>
                  {job.application_link ? (
                    <a
                      href={job.application_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                      <Briefcase className="size-3.5" /> Lamar Sekarang
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">Hubungi institusi untuk melamar</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
