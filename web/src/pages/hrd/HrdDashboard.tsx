import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Building2,
  ClipboardCheck,
  FileText,
  Inbox,
  PlusCircle,
  Send,
  UserCheck,
} from 'lucide-react'
import { useHrdDashboard } from '../../hooks/queries'
import type { JobApplicationStatus } from '../../lib/types'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { Card, CardHeader } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateViews'
import { Badge } from '../../components/ui/Badge'

export const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  submitted: 'Diajukan',
  reviewing: 'Direview',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  accepted: 'Diterima',
  rejected: 'Ditolak',
  withdrawn: 'Ditarik',
}

export const APPLICATION_STATUS_TONES: Record<JobApplicationStatus, 'slate' | 'sky' | 'indigo' | 'violet' | 'green' | 'rose' | 'amber'> = {
  submitted: 'slate',
  reviewing: 'sky',
  shortlisted: 'indigo',
  interview: 'violet',
  accepted: 'green',
  rejected: 'rose',
  withdrawn: 'amber',
}

export function HrdDashboard() {
  const { data, isPending, isError, refetch } = useHrdDashboard()

  if (isPending) return <LoadingState label="Memuat dashboard hrd…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat data dashboard" onRetry={() => refetch()} />
  }

  const apps = data.applications

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Dashboard HRD</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola lowongan dan pantau lamaran yang masuk</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lowongan Aktif" value={data.vacancies.published} sub={`${data.vacancies.total} total lowongan`} icon={Briefcase} tone="indigo" delay={0} />
        <StatCard label="Total Pelamar" value={apps.total.toLocaleString('id-ID')} sub={`${apps.rejected} ditolak`} icon={Inbox} tone="sky" delay={80} />
        <StatCard label="Lamaran Baru" value={apps.new.toLocaleString('id-ID')} sub="Menunggu direview" icon={Send} tone="amber" delay={160} />
        <StatCard label="Diterima" value={apps.accepted.toLocaleString('id-ID')} sub={`${apps.interview} tahap interview`} icon={UserCheck} tone="emerald" delay={240} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="animate-fade-in-up lg:col-span-3" style={{ animationDelay: '120ms' }}>
          <Card>
            <CardHeader
              title="Lamaran Terbaru"
              subtitle="5 pelamar terakhir yang masuk"
              actions={
                <Link to="/hrd/lamaran" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  Kelola lamaran <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <div className="divide-y divide-slate-100">
              {data.recent_applications.length === 0 ? (
                <EmptyState title="Belum ada pelamar" description="Pelamar akan tampil di sini setelah ada yang melamar lowongan Anda." />
              ) : (
                data.recent_applications.map((app) => (
                  <Link
                    key={app.id}
                    to="/hrd/lamaran"
                    className="flex animate-fade-in items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                        {(app.alumni?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{app.alumni?.name ?? 'Alumni'}</p>
                        <p className="truncate text-xs text-slate-400">{app.vacancy?.title ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={APPLICATION_STATUS_TONES[app.status]}>{APPLICATION_STATUS_LABELS[app.status]}</Badge>
                      <span className="hidden text-xs text-slate-400 sm:block">{formatDate(app.applied_at)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="animate-fade-in-up space-y-6 lg:col-span-2" style={{ animationDelay: '200ms' }}>
          <Card>
            <CardHeader title="Tahap Seleksi" subtitle="Sebaran lamaran per tahap" />
            <div className="space-y-3 px-5 py-4">
              {(
                [
                  ['new', 'Diajukan', 'bg-slate-400'],
                  ['reviewing', 'Direview', 'bg-sky-500'],
                  ['shortlisted', 'Shortlisted', 'bg-indigo-500'],
                  ['interview', 'Interview', 'bg-violet-500'],
                  ['accepted', 'Diterima', 'bg-emerald-500'],
                  ['rejected', 'Ditolak', 'bg-rose-500'],
                ] as const
              ).map(([key, label, color]) => {
                const count = apps[key]
                const pct = apps.total > 0 ? Math.round((count / apps.total) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/hrd/lowongan"
              className="animate-fade-in-up group flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <PlusCircle className="size-5 text-indigo-600" />
              <p className="text-sm font-semibold text-slate-800">Buat Lowongan</p>
              <p className="text-xs text-slate-500">Sebarkan ke seluruh sekolah</p>
            </Link>
            <Link
              to="/hrd/lamaran"
              className="animate-fade-in-up group flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <ClipboardCheck className="size-5 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-800">Review Lamaran</p>
              <p className="text-xs text-slate-500">{apps.new} menunggu tindakan</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '280ms' }}>
        <Card>
          <CardHeader
            title="Lowongan Saya"
            subtitle="5 lowongan terakhir beserta jumlah pelamarnya"
            actions={
              <Link to="/hrd/lowongan" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                Kelola lowongan <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {data.my_vacancies.length === 0 ? (
            <EmptyState title="Belum ada lowongan" description="Buat lowongan pertama Anda agar terlihat oleh alumni." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.my_vacancies.map((job) => (
                <Link
                  key={job.id}
                  to="/hrd/lowongan"
                  className="flex animate-fade-in items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Briefcase className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{job.title}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                        <Building2 className="size-3" /> {job.company_name}
                        {job.location ? ` • ${job.location}` : ''}
                        {job.employment_type ? ` • ${EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                    <span className="hidden sm:inline">{formatDate(job.posted_at ?? job.created_at)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      <FileText className="size-3" /> {job.applicants_count ?? 0}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
