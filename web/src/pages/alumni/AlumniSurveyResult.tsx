import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react'
import { useMyResponse } from '../../hooks/queries'
import { formatDateTime } from '../../lib/format'
import { AlumniAnswerSummary } from './AlumniAnswerSummary'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'

export function AlumniSurveyResult() {
  const { responseId = '' } = useParams()
  const navigate = useNavigate()
  const { data: fill, isPending, isError, refetch } = useMyResponse(responseId)

  if (isPending) return <LoadingState label="Memuat jawaban Anda…" />
  if (isError || !fill) {
    return <ErrorState message="Gagal memuat jawaban Anda" onRetry={() => refetch()} />
  }

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
        <Button variant="secondary" onClick={() => navigate('/kuisioner')}>
          <ArrowLeft className="size-4" /> Kembali ke Kuisioner
        </Button>
        <Button onClick={() => navigate('/home')}>Ke Beranda</Button>
      </div>
    </div>
  )
}
