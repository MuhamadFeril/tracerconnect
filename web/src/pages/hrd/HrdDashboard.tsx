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
import { EMPLOYMENT_TYPE_LABELS, formatDate, initials } from '../../lib/format'
import { getUser } from '../../lib/auth'
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

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

export function HrdDashboard() {
  const { data, isPending, isError, refetch } = useHrdDashboard()
  const user = getUser()
  const name = user?.name?.trim().split(/\s+/)[0] ?? 'HRD'

  if (isPending) return <LoadingState label="Memuat dashboard hrd…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat data dashboard" onRetry={() => refetch()} />
  }

  const apps = data.applications

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-6 right-1/4 hidden size-3 rounded-full bg-white/20 sm:block" />
        <div className="pointer-events-none absolute right-10 bottom-8 hidden size-2 rounded-full bg-white/30 sm:block" />

        <div className="relative">
          <p className="text-xs font-medium tracking-widest text-indigo-200 uppercase">Portal HRD</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()}, {name}! 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100/90">
            Kelola lowongan dan review lamaran dari alumni terbaik untuk perusahaan Anda — semuanya dalam satu tempat.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/hrd/lowongan"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <PlusCircle className="size-4" /> Buat Lowongan
            </Link>
            <Link
              to="/hrd/lamaran"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              <ClipboardCheck className="size-4" /> Review Lamaran
              {apps.new > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                  {apps.new > 99 ? '99+' : apps.new}
                </span>
              )}
            </Link>
          </div>

          <div className="mt-7 grid max-w-lg grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
              <p className="text-2xl font-bold tracking-tight">{data.vacancies.published}</p>
              <p className="mt-0.5 text-xs text-indigo-100/80">Lowongan Aktif</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
              <p className="text-2xl font-bold tracking-tight">{apps.total.toLocaleString('id-ID')}</p>
              <p className="mt-0.5 text-xs text-indigo-100/80">Total Pelamar</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
              <p className="text-2xl font-bold tracking-tight">{apps.accepted.toLocaleString('id-ID')}</p>
              <p className="mt-0.5 text-xs text-indigo-100/80">Diterima</p>
            </div>
          </div>
        </div>
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
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 text-xs font-bold text-white">
                        {initials(app.alumni?.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{app.alumni?.name ?? 'Alumni'}</p>
                        <p className="truncate text-xs text-slate-400">{app.vacancy?.title ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {app.status === 'submitted' && (
                        <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:block">
                          Baru
                        </span>
                      )}
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

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Aksi Cepat</h3>
              <p className="mt-0.5 text-xs text-slate-500">Langkah yang paling sering dilakukan</p>
            </div>
            <div className="divide-y divide-slate-100">
              <Link
                to="/hrd/lowongan"
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-indigo-50/60"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <PlusCircle className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Buat Lowongan</p>
                  <p className="text-xs text-slate-400">Sebarkan ke seluruh sekolah</p>
                </div>
                <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </Link>
              <Link
                to="/hrd/lamaran"
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-amber-50/60"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <ClipboardCheck className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Review Lamaran</p>
                  <p className="text-xs text-slate-400">{apps.new} menunggu tindakan</p>
                </div>
                <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" />
              </Link>
            </div>
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