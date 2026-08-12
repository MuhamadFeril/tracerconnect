import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  MapPin,
  Trash2,
} from 'lucide-react'
import { apiError } from '../../lib/api'
import {
  useCancelApplication,
  useMyJobApplications,
  useSavedJobs,
  useUnsaveJob,
} from '../../hooks/queries'
import { APPLICATION_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import type { JobApplicationStatus } from '../../lib/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

const STATUS_TONES: Record<JobApplicationStatus, 'amber' | 'sky' | 'green' | 'rose' | 'slate'> = {
  pending: 'amber',
  reviewed: 'sky',
  accepted: 'green',
  rejected: 'rose',
  cancelled: 'slate',
}

function ApplicationCard({
  application,
  onCancel,
  cancelling,
}: {
  application: {
    id: string
    job: { id: string; title: string; company_name: string; location: string | null } | null
    message: string | null
    status: JobApplicationStatus
    created_at?: string
  }
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const canCancel = application.status === 'pending' || application.status === 'reviewed'

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
          {(application.job?.company_name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{application.job?.title ?? 'Lowongan'}</h2>
            <Badge tone={STATUS_TONES[application.status]}>
              {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{application.job?.company_name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {application.job?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {application.job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> Dilamar {formatDate(application.created_at)}
            </span>
          </div>
        </div>
      </div>

      {application.message && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Pesan Anda</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{application.message}</p>
        </div>
      )}

      {canCancel && (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onCancel(application.id)} loading={cancelling} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            <Trash2 className="size-3.5" /> Batalkan Lamaran
          </Button>
        </div>
      )}
    </Card>
  )
}

export function MyApplications() {
  const toast = useToast()
  const [tab, setTab] = useState<'applications' | 'saved'>('applications')
  const [appPage, setAppPage] = useState(1)
  const [savedPage, setSavedPage] = useState(1)

  const applications = useMyJobApplications({ page: appPage })
  const savedJobs = useSavedJobs({ page: savedPage })
  const cancel = useCancelApplication()
  const unsave = useUnsaveJob()

  const onCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id)
      toast('Lamaran dibatalkan')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const onUnsave = async (jobId: string) => {
    try {
      await unsave.mutateAsync(jobId)
      toast('Lowongan dihapus dari tersimpan')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Lamaran Saya" subtitle="Pantau status lamaran dan lowongan yang Anda simpan" />

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(
          [
            ['applications', 'Lamaran Saya', Briefcase],
            ['saved', 'Tersimpan', Bookmark],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors',
              tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <Icon className="size-4" /> {label}
            <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-bold', tab === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>
              {key === 'applications' ? (applications.data?.meta.total ?? 0) : (savedJobs.data?.meta.total ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {tab === 'applications' ? (
        applications.isPending ? (
          <LoadingState />
        ) : applications.isError ? (
          <ErrorState message="Gagal memuat lamaran" onRetry={() => applications.refetch()} />
        ) : (applications.data?.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              title="Belum ada lamaran"
              description="Anda belum melamar lowongan apa pun. Jelajahi lowongan dan kirim lamaran pertama Anda."
              action={<Link to="/lowongan" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">Cari Lowongan <ArrowUpRight className="size-4" /></Link>}
            />
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {(applications.data?.data ?? []).map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onCancel={onCancel}
                  cancelling={cancel.isPending && cancel.variables === application.id}
                />
              ))}
            </div>
            <Pagination meta={applications.data?.meta} onPageChange={setAppPage} />
          </>
        )
      ) : savedJobs.isPending ? (
        <LoadingState />
      ) : savedJobs.isError ? (
        <ErrorState message="Gagal memuat lowongan tersimpan" onRetry={() => savedJobs.refetch()} />
      ) : (savedJobs.data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada lowongan tersimpan"
            description="Simpan lowongan yang menarik agar mudah ditemukan kembali."
            action={<Link to="/lowongan" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">Jelajahi Lowongan <ArrowUpRight className="size-4" /></Link>}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {(savedJobs.data?.data ?? []).map((saved) => (
              <Card key={saved.id} className="flex items-center gap-4 p-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
                  {(saved.job?.company_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{saved.job?.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs text-slate-500">{saved.job?.company_name}</p>
                    {saved.job?.employment_type && (
                      <Badge tone="sky">{EMPLOYMENT_TYPE_LABELS[saved.job.employment_type] ?? saved.job.employment_type}</Badge>
                    )}
                    {saved.job?.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3" /> {saved.job.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {saved.job?.has_applied ? (
                    <Badge tone="green">✓ Sudah Dilamar</Badge>
                  ) : (
                    <Link
                      to="/lowongan"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                      <Briefcase className="size-3.5" /> Lamar
                    </Link>
                  )}
                  <button
                    onClick={() => saved.job && onUnsave(saved.job.id)}
                    disabled={unsave.isPending}
                    title="Hapus dari tersimpan"
                    className="flex size-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    {unsave.isPending && unsave.variables === saved.job?.id ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500" />
                    ) : (
                      <BookmarkCheck className="size-4.5" />
                    )}
                  </button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={savedJobs.data?.meta} onPageChange={setSavedPage} />
        </>
      )}
    </div>
  )
}
