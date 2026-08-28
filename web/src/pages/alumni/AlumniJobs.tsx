import { useEffect, useState } from 'react'
import { ArrowUpRight, Briefcase, ChevronRight, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useJobVacancies } from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { useDebounce } from '../../hooks/useDebounce'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'

const TYPE_TONES: Record<string, 'indigo' | 'sky' | 'violet' | 'amber' | 'slate'> = {
  full_time: 'indigo',
  part_time: 'sky',
  internship: 'violet',
  contract: 'amber',
  freelance: 'slate',
}

const EMPLOYMENT_TYPES = Object.entries(EMPLOYMENT_TYPE_LABELS) as [string, string][]

export function AlumniJobs() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const search = useDebounce(searchInput, 350)

  // Reset to page 1 when filters change.
  useEffect(() => { setPage(1) }, [search, typeFilter])

  const { data, isPending, isError, refetch } = useJobVacancies({
    page,
    search: search || undefined,
    employment_type: typeFilter || undefined,
  })

  const rows = data?.data ?? []
  const hasActiveFilters = Boolean(search || typeFilter)

  const clearFilters = () => {
    setSearchInput('')
    setTypeFilter('')
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Lowongan Kerja" subtitle="Peluang karier yang dikurasi institusi untuk alumni" />

      {/* ── Search & Filters ── */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari lowongan berdasarkan judul atau perusahaan…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Employment type filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-8.5 text-sm text-slate-700 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              >
                <option value="">Semua Tipe</option>
                {EMPLOYMENT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="size-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-medium text-slate-400">Filter aktif:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                Pencarian: "{search}"
                <button onClick={() => setSearchInput('')} className="ml-0.5 text-indigo-400 hover:text-indigo-700">×</button>
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                Tipe: {EMPLOYMENT_TYPE_LABELS[typeFilter]}
                <button onClick={() => setTypeFilter('')} className="ml-0.5 text-indigo-400 hover:text-indigo-700">×</button>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* ── Results ── */}
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat lowongan" onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={hasActiveFilters ? 'Tidak ada lowongan yang cocok' : 'Tidak ada lowongan'}
            description={hasActiveFilters ? 'Coba ubah kata kunci atau filter pencarian.' : 'Belum ada lowongan kerja dari institusi Anda.'}
            action={hasActiveFilters ? <Button variant="secondary" onClick={clearFilters}>Reset Filter</Button> : undefined}
          />
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
                    <Link
                      to={`/lowongan/${job.id}`}
                      className="group inline-flex items-center gap-1 text-sm font-semibold text-slate-900 transition-colors hover:text-indigo-600"
                    >
                      <span className="truncate">{job.title}</span>
                      <ChevronRight className="size-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </Link>
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    {job.posted_at ? `Diposting ${formatDate(job.posted_at)}` : 'Baru diposting'}
                  </span>
                  <Link
                    to={`/lowongan/${job.id}`}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                  >
                    Lihat Detail
                  </Link>
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
