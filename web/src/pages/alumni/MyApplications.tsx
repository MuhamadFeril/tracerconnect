import { useState } from 'react'
import { Building2, Check, Undo2 } from 'lucide-react'
import { useMyApplications, useWithdrawApplication } from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { apiError } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'
import type { JobApplication } from '../../lib/types'

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  submitted: 'Diajukan',
  reviewing: 'Sedang Ditinjau',
  shortlisted: 'Masuk Daftar Pendek',
  interview: 'Interview',
  accepted: 'Diterima',
  rejected: 'Ditolak',
  withdrawn: 'Ditarik',
}

const STATUS_TONES: Record<string, 'sky' | 'amber' | 'indigo' | 'violet' | 'green' | 'rose' | 'slate'> = {
  submitted: 'sky',
  reviewing: 'amber',
  shortlisted: 'violet',
  interview: 'indigo',
  accepted: 'green',
  rejected: 'rose',
  withdrawn: 'slate',
}

export function MyApplications() {
  const [page, setPage] = useState(1)
  const [withdrawing, setWithdrawing] = useState<JobApplication | null>(null)
  const { data, isPending, isError, refetch } = useMyApplications({ page })
  const withdraw = useWithdrawApplication(withdrawing?.id ?? '')
  const toast = useToast()

  const rows = data?.data ?? []

  const confirmWithdraw = async () => {
    if (!withdrawing) return
    try {
      await withdraw.mutateAsync()
      toast('Lamaran berhasil ditarik')
      setWithdrawing(null)
    } catch (err) {
      toast(apiError(err), 'error')
      setWithdrawing(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Lamaran Saya" subtitle="Pantau status lamaran pekerjaan Anda" />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat lamaran" onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada lamaran" description="Lamaran yang Anda kirim akan muncul di sini." />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((application) => (
              <Card key={application.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
                      {(application.vacancy?.company_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900">{application.vacancy?.title ?? 'Lowongan'}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 className="size-3.5" /> {application.vacancy?.company_name}
                        {application.vacancy?.employment_type ? (
                          <span className="text-slate-400">
                            · {EMPLOYMENT_TYPE_LABELS[application.vacancy.employment_type] ?? application.vacancy.employment_type}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONES[application.status] ?? 'slate'}>
                      {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>
                      Dilamar {application.applied_at ? formatDate(application.applied_at) : '—'}
                    </span>
                    {application.cover_letter && (
                      <span className="max-w-xs truncate" title={application.cover_letter}>
                        {application.cover_letter}
                      </span>
                    )}
                  </div>
                  {application.status !== 'withdrawn' && application.status !== 'accepted' && application.status !== 'rejected' && (
                    <button
                      onClick={() => setWithdrawing(application)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Undo2 className="size-3.5" /> Tarik Lamaran
                    </button>
                  )}
                  {application.status === 'accepted' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <Check className="size-3.5" /> Selamat! Lamaran Anda diterima
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        onClose={() => setWithdrawing(null)}
        onConfirm={confirmWithdraw}
        loading={withdraw.isPending}
        title="Tarik Lamaran"
        message={
          <>
            Lamaran untuk <span className="font-semibold text-slate-800">{withdrawing?.vacancy?.title}</span> akan
            ditarik. Anda tidak dapat mengubah statusnya setelah ditarik.
          </>
        }
      />
    </div>
  )
}
