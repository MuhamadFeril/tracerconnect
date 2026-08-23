import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  GraduationCap,
  MapPin,
  Search,
  Users,
} from 'lucide-react'
import { useEmployerAlumni, useDepartments, useGraduationYears } from '../../hooks/queries'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateViews'
import { Badge } from '../../components/ui/Badge'

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  working: 'Bekerja',
  unemployed: 'Tidak Bekerja',
  entrepreneur: 'Wirausaha',
  continuing_study: 'Melanjutkan Studi',
}

const EMPLOYMENT_STATUS_TONES: Record<string, 'green' | 'amber' | 'sky' | 'slate'> = {
  working: 'green',
  unemployed: 'amber',
  entrepreneur: 'sky',
  continuing_study: 'slate',
}

export function EmployerAlumniPage() {
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [graduationYearId, setGraduationYearId] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useEmployerAlumni({
    search: search || undefined,
    department_id: departmentId || undefined,
    graduation_year_id: graduationYearId || undefined,
    employment_status: employmentStatus || undefined,
    page,
  })

  const departments = useDepartments()
  const gradYears = useGraduationYears()

  const alumni = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Direktori Alumni</h1>
        <p className="mt-1 text-sm text-slate-500">Cari dan lihat profil alumni, minta CV langsung</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Alumni" value={meta?.total?.toLocaleString('id-ID') ?? '0'} icon={Users} tone="indigo" />
        <StatCard label="Departemen" value={departments.data?.data?.length?.toLocaleString('id-ID') ?? '0'} icon={Briefcase} tone="sky" />
        <StatCard label="Tahun Lulus" value={gradYears.data?.data?.length?.toLocaleString('id-ID') ?? '0'} icon={GraduationCap} tone="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, posisi, perusahaan…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Semua Jurusan</option>
          {departments.data?.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={graduationYearId}
          onChange={(e) => { setGraduationYearId(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Semua Tahun</option>
          {gradYears.data?.data?.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </select>
        <select
          value={employmentStatus}
          onChange={(e) => { setEmploymentStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Semua Status</option>
          <option value="working">Bekerja</option>
          <option value="unemployed">Tidak Bekerja</option>
          <option value="entrepreneur">Wirausaha</option>
          <option value="continuing_study">Melanjutkan Studi</option>
        </select>
      </div>

      {/* Results */}
      {isPending && <LoadingState label="Memuat direktori alumni…" />}
      {isError && <ErrorState message="Gagal memuat data alumni" onRetry={() => refetch()} />}
      {!isPending && !isError && alumni.length === 0 && (
        <EmptyState title="Tidak ada alumni ditemukan" description="Coba ubah filter pencarian Anda." />
      )}

      {alumni.length > 0 && (
        <div className="space-y-3">
          {alumni.map((a) => (
            <Link
              key={a.id}
              to={`/employer/alumni/${a.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{a.name}</h3>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {a.department && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="size-3" /> {a.department}
                        {a.graduation_year ? ` '${String(a.graduation_year).slice(-2)}` : ''}
                      </span>
                    )}
                    {a.position && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="size-3" /> {a.position}
                        {a.company_name ? ` — ${a.company_name}` : ''}
                      </span>
                    )}
                    {a.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {a.location}
                      </span>
                    )}
                  </div>
                  {a.skills && a.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.skills.slice(0, 5).map((skill) => (
                        <span key={skill} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">{skill}</span>
                      ))}
                      {a.skills.length > 5 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">+{a.skills.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {a.employment_status && (
                    <Badge tone={EMPLOYMENT_STATUS_TONES[a.employment_status] ?? 'slate'}>
                      {EMPLOYMENT_STATUS_LABELS[a.employment_status] ?? a.employment_status}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-slate-500">
                {meta.current_page} / {meta.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
