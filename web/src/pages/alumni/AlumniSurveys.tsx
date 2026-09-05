import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, ClipboardList, FileQuestion, PencilLine } from 'lucide-react'
import { apiError } from '../../lib/api'
import { useAlumniSurveys, useEditSurvey } from '../../hooks/queries'
import { formatDate } from '../../lib/format'
import type { AlumniSurveyItem } from '../../lib/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

function SurveyAction({ survey }: { survey: AlumniSurveyItem }) {
  const { status } = survey.response
  const navigate = useNavigate()
  const toast = useToast()
  const edit = useEditSurvey(survey.id)
  const [busy, setBusy] = useState(false)

  if (status === 'expired') {
    return (
      <Badge tone="rose" className="px-3 py-1">
        Kedaluwarsa
      </Badge>
    )
  }

  if (status === 'submitted') {
    // The survey is still open (only open surveys are listed), so the
    // respondent may update their submitted answers or view them read-only.
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          loading={busy || edit.isPending}
          onClick={async () => {
            setBusy(true)
            try {
              await edit.mutateAsync()
              toast('Jawaban dapat diperbarui')
              navigate(`/kuisioner/${survey.id}`)
            } catch (err) {
              setBusy(false)
              toast(apiError(err))
            }
          }}
        >
          <PencilLine className="size-4" /> Perbarui Jawaban
        </Button>
        {survey.response.id && (
          <Link
            to={`/kuisioner/hasil/${survey.response.id}`}
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
          >
            Lihat Jawaban
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <Link
      to={`/kuisioner/${survey.id}`}
      className="inline-flex h-8 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
    >
      {status === 'in_progress' ? 'Lanjutkan' : 'Mulai Isi'}
      <ArrowRight className="size-3.5" />
    </Link>
  )
}

export function AlumniSurveys() {
  const { data, isPending, isError, refetch } = useAlumniSurveys()

  if (isPending) return <LoadingState label="Memuat kuisioner…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat daftar kuisioner" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kuisioner"
        subtitle="Survey tracer study yang tersedia untuk Anda isi"
      />

      {data.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada kuisioner tersedia"
            description="Saat institusi Anda menerbitkan survey tracer study, kuisionernya akan muncul di sini."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((survey) => {
            const { status, completion } = survey.response
            return (
              <Card key={survey.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 text-white shadow-md shadow-indigo-500/25">
                      <ClipboardList className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900">{survey.title}</h2>
                      {survey.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{survey.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <FileQuestion className="size-3.5 text-indigo-400" />
                          {survey.questions_count} pertanyaan
                        </span>
                        {survey.expires_at && (
                          <span className="flex items-center gap-1.5">
                            <CalendarClock className="size-3.5 text-indigo-400" />
                            Batas {formatDate(survey.expires_at)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          Status:{' '}
                          {status === 'not_started' ? (
                            <Badge tone="indigo">Belum diisi</Badge>
                          ) : (
                            <StatusBadge status={status} />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2.5">
                    {status === 'in_progress' && typeof completion === 'number' && (
                      <div className="w-36">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Progres</span>
                          <span className="font-medium text-slate-700">{completion}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <SurveyAction survey={survey} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
