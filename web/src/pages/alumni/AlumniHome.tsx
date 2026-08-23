import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Megaphone,
} from 'lucide-react'
import { getUser } from '../../lib/auth'
import {
  useAlumniHome,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyResponses,
  useNotifications,
  useUnreadNotificationsCount,
} from '../../hooks/queries'
import { avatarUrl, EMPLOYMENT_TYPE_LABELS, formatDate, formatDateTime, initials } from '../../lib/format'
import type { AlumniProfileSummary } from '../../lib/types'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge, EmploymentBadge, StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { NotificationRow } from '../../components/alumni/NotificationRow'

function careerDetail(a: AlumniProfileSummary): string {
  if (a.employment_status === 'working') {
    const bits = [a.company_name, a.position]
    if (a.business_field) bits.push(a.business_field)
    if (a.work_city) bits.push([a.work_city, a.work_province].filter(Boolean).join(', '))
    return bits.filter(Boolean).join(' · ') || '—'
  }
  if (a.employment_status === 'continuing_study') {
    return [a.study_institution, a.study_program].filter(Boolean).join(' · ') || '—'
  }
  if (a.employment_status === 'entrepreneur') {
    const bits = [a.business_name]
    if (a.business_field) bits.push(a.business_field)
    if (a.business_city) bits.push([a.business_city, a.business_province].filter(Boolean).join(', '))
    return bits.filter(Boolean).join(' · ') || '—'
  }
  return '—'
}

function HomeSectionHeader({
  icon: Icon,
  title,
  to,
}: {
  icon: typeof Megaphone
  title: string
  to: string
}) {
  return (
    <CardHeader
      title={
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-indigo-500" /> {title}
        </span>
      }
      actions={
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          Lihat semua <ChevronRight className="size-3.5" />
        </Link>
      }
    />
  )
}

export function AlumniHome() {
  const user = getUser()
  const { data, isPending, isError, refetch } = useAlumniHome()

  if (isPending) return <LoadingState label="Memuat beranda alumni…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat beranda alumni" onRetry={() => refetch()} />
  }

  const { institution, alumni, announcements, events, jobs } = data
  const avatarSrc = avatarUrl(user?.avatar_url)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-center gap-4">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="size-14 rounded-full object-cover ring-2 ring-indigo-100" />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 text-lg font-bold text-white ring-2 ring-indigo-100">
            {initials(user?.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Halo, {user?.name ?? 'Alumni'} 👋
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="indigo">Alumni</Badge>
            {institution ? (
              <Badge tone="slate">{institution.name}</Badge>
            ) : (
              <Badge tone="amber">Belum terhubung ke institusi</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick overview stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pengumuman" value={announcements.length} icon={Megaphone} tone="indigo" />
        <StatCard label="Acara Mendatang" value={events.length} icon={CalendarDays} tone="sky" />
        <StatCard label="Lowongan Tersedia" value={jobs.length} icon={Briefcase} tone="emerald" />
      </div>

      {/* No institution notice */}
      {!institution && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Building2 className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm leading-relaxed text-amber-800">
            <p className="font-semibold">Akun Anda belum terhubung ke institusi.</p>
            <p className="mt-0.5">
              Pengumuman, acara, dan lowongan dari institusi akan muncul di sini setelah akun
              dihubungkan oleh pengelola institusi.
            </p>
          </div>
        </div>
      )}

      {/* Alumni profile strip */}
      {alumni && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'NIS/NIM', value: alumni.nis_nim ?? '—' },
            { label: 'Jurusan', value: alumni.department ?? '—' },
            { label: 'Tahun Lulus', value: alumni.graduation_year ? String(alumni.graduation_year) : '—' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-medium text-slate-400">{item.label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium text-slate-400">Status Kerja</p>
            <div className="mt-1">
              <EmploymentBadge status={alumni.employment_status} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium text-slate-400">Detail Karir</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{careerDetail(alumni)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Announcements */}
        <Card>
          <HomeSectionHeader icon={Megaphone} title="Pengumuman Terbaru" to="/pengumuman" />
          <div className="divide-y divide-slate-100">
            {announcements.length === 0 ? (
              <EmptyState title="Belum ada pengumuman" />
            ) : (
              announcements.map((a) => (
                <Link key={a.id} to="/pengumuman" className="block px-5 py-3.5 transition-colors hover:bg-slate-50">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.body}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{formatDate(a.published_at)}</p>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Events */}
        <Card>
          <HomeSectionHeader icon={CalendarDays} title="Acara Mendatang" to="/acara" />
          <div className="divide-y divide-slate-100">
            {events.length === 0 ? (
              <EmptyState title="Belum ada acara" />
            ) : (
              events.map((event) => (
                <Link key={event.id} to="/acara" className="block px-5 py-3.5 transition-colors hover:bg-slate-50">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays className="size-3.5 text-indigo-400" />
                    {formatDateTime(event.starts_at)}
                  </p>
                  {event.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Building2 className="size-3.5 text-indigo-300" />
                      {event.location}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Jobs */}
        <Card>
          <HomeSectionHeader icon={Briefcase} title="Lowongan Terbaru" to="/lowongan" />
          <div className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <EmptyState title="Belum ada lowongan" />
            ) : (
              jobs.map((job) => (
                <Link key={job.id} to="/lowongan" className="block px-5 py-3.5 transition-colors hover:bg-slate-50">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{job.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{job.company_name}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    {job.employment_type ? (
                      <Badge tone="sky">
                        {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                      </Badge>
                    ) : null}
                    {job.location && <span>{job.location}</span>}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Notifications & tracer history */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AlumniNotifications />
        <AlumniTracerHistory />
      </div>

      {/* Alumni-only CTA toward the tracer survey area */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Kuisioner tracer study tersedia</p>
            <p className="text-xs text-indigo-100">Isi survey dari institusi Anda dan lengkapi data tracer study</p>
          </div>
        </div>
        <Link
          to="/kuisioner"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
        >
          <ClipboardList className="size-4" /> Isi Kuisioner <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function AlumniNotifications() {
  const notifications = useNotifications({ page: 1, per_page: 5 })
  const unread = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = notifications.data?.data ?? []
  const unreadCount = unread.data?.count ?? 0

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Bell className="size-4 text-indigo-500" /> Notifikasi
          </span>
        }
        subtitle={
          unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua notifikasi sudah dibaca'
        }
        actions={
          <>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll.mutate()}
                loading={markAll.isPending}
              >
                <CheckCheck className="size-4" /> Tandai semua dibaca
              </Button>
            )}
            <Link
              to="/notifikasi"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Lihat semua <ChevronRight className="size-3.5" />
            </Link>
          </>
        }
      />
      {notifications.isPending ? (
        <LoadingState label="Memuat notifikasi…" />
      ) : notifications.isError ? (
        <ErrorState message="Gagal memuat notifikasi" onRetry={() => notifications.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Notifikasi pengumuman, acara, dan lowongan baru akan muncul di sini."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={() => markRead.mutate(notification.id)}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Tracer history                                                      */
/* ------------------------------------------------------------------ */

function AlumniTracerHistory() {
  const responses = useMyResponses({ page: 1, per_page: 5 })
  const items = responses.data?.data ?? []

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ClipboardList className="size-4 text-indigo-500" /> Riwayat Tracer Study
          </span>
        }
        subtitle="Respons survey yang pernah Anda isi"
      />
      {responses.isPending ? (
        <LoadingState label="Memuat riwayat…" />
      ) : responses.isError ? (
        <ErrorState message="Gagal memuat riwayat respons" onRetry={() => responses.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada respons"
          description="Riwayat pengisian tracer study akan muncul di sini."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((response) => {
            const inner = (
              <>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ClipboardList className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {response.survey?.title ?? 'Survey'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {response.submitted_at
                      ? `Selesai ${formatDateTime(response.submitted_at)}`
                      : `Dimulai ${formatDateTime(response.started_at)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof response.completion === 'number' && (
                    <span className="text-xs font-medium text-slate-500">{response.completion}%</span>
                  )}
                  <StatusBadge status={response.status} />
                </div>
              </>
            )

            const className = 'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50'

            if (response.status === 'submitted' && response.id) {
              return (
                <Link key={response.id} to={`/kuisioner/hasil/${response.id}`} className={className}>
                  {inner}
                </Link>
              )
            }
            if (response.status === 'in_progress' && response.survey?.id) {
              return (
                <Link key={response.id} to={`/kuisioner/${response.survey.id}`} className={className}>
                  {inner}
                </Link>
              )
            }
            return (
              <div key={response.id} className="flex items-center gap-3 px-5 py-3.5">
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
