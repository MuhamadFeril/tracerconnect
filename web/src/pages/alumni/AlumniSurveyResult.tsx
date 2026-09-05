import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ClipboardList, PencilLine } from 'lucide-react'
import { useEditSurvey, useMyResponse } from '../../hooks/queries'
import { apiError } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { AlumniAnswerSummary } from './AlumniAnswerSummary'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

/**
 * Whether the survey a response belongs to is still accepting answers:
 * published, not started yet in the future, and not expired.
 */
function isSurveyOpen(survey: { status: string; starts_at: string | null; expires_at: string | null }): boolean {
  if (survey.status !== 'published') return false
  if (survey.starts_at && new Date(survey.starts_at).getTime() > Date.now()) return false
  if (survey.expires_at && new Date(survey.expires_at).getTime() < Date.now()) return false
  return true
}

export function AlumniSurveyResult() {
  const { responseId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: fill, isPending, isError, refetch } = useMyResponse(responseId)
  const edit = useEditSurvey(fill?.survey_id ?? '')

  if (isPending) return <LoadingState label="Memuat jawaban Anda…" />
  if (isError || !fill) {
    return <ErrorState message="Gagal memuat jawaban Anda" onRetry={() => refetch()} />
  }

  const editable = fill.status === 'submitted' && isSurveyOpen(fill.survey)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/kuisioner"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
      >
        <ArrowLeft className="size-3.5" /> Daftar Kuisioner
      </Link>

      <Card className="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">{fill.survey.title}</h1>
                <StatusBadge status={fill.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Versi {fill.version}
                {fill.submitted_at ? ` · Dikirim ${formatDateTime(fill.submitted_at)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
            <ClipboardList className="size-3.5 text-indigo-400" />
            Ringkasan jawaban Anda (hanya-baca)
          </div>
        </div>
      </Card>

      <AlumniAnswerSummary fill={fill} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {editable && (
          <Button
            loading={edit.isPending}
            onClick={async () => {
              try {
                await edit.mutateAsync()
                toast('Jawaban dapat diperbarui')
                navigate(`/kuisioner/${fill.survey_id}`)
              } catch (err) {
                toast(apiError(err))
              }
            }}
          >
            <PencilLine className="size-4" /> Ubah Jawaban
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate('/kuisioner')}>
          <ArrowLeft className="size-4" /> Kembali ke Kuisioner
        </Button>
        <Button onClick={() => navigate('/home')}>Ke Beranda</Button>
      </div>
    </div>
  )
}
