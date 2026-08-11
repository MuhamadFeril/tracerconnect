import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Trash2, User as UserIcon } from 'lucide-react'
import { apiError } from '../lib/api'
import { useDeleteResponse, useResponse } from '../hooks/queries'
import { formatAnswerValue, formatDateTime, QUESTION_TYPE_LABELS } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

export function ResponseDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: r, isPending, isError, refetch } = useResponse(id)
  const deleteResponse = useDeleteResponse()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isPending) return <LoadingState label="Memuat respons…" />
  if (isError || !r) return <ErrorState message="Gagal memuat respons" onRetry={() => refetch()} />

  const onDelete = async () => {
    try {
      await deleteResponse.mutateAsync(r.id)
      toast('Respons berhasil dihapus')
      navigate('/responses')
    } catch (err) {
      toast(apiError(err), 'error')
      setConfirmOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/responses" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
        <ArrowLeft className="size-4" /> Semua Respons
      </Link>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{r.respondent?.name ?? 'Responden'}</h1>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{r.survey?.title ?? '—'} · v{r.version}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Mulai: {formatDateTime(r.started_at)}</span>
              <span>Dikirim: {formatDateTime(r.submitted_at)}</span>
            </div>
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)} loading={deleteResponse.isPending}>
            <Trash2 className="size-4" /> Hapus
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Jawaban" subtitle={`${r.answers.length} jawaban tersimpan`} />
        {r.answers.length === 0 ? (
          <EmptyState title="Belum ada jawaban" description="Responden belum menyimpan jawaban apapun." />
        ) : (
          <div className="divide-y divide-slate-100">
            {r.answers.map((answer) => (
              <div key={answer.question_id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{answer.question?.label ?? 'Pertanyaan terhapus'}</p>
                  <Badge tone="indigo">{QUESTION_TYPE_LABELS[answer.question?.type ?? ''] ?? answer.question?.type}</Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {formatAnswerValue(answer.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Informasi Responden" />
        <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <UserIcon className="size-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Nama</p>
              <p className="text-sm font-medium text-slate-800">{r.respondent?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-medium text-slate-800">{r.respondent?.email ?? '—'}</p>
            </div>
          </div>
          {r.alumni && (
            <>
              <div className="flex items-center gap-3">
                <UserIcon className="size-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Data Alumni</p>
                  <p className="text-sm font-medium text-slate-800">{r.alumni.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">NIS/NIM</span>
                <p className="font-mono text-sm font-medium text-slate-800">{r.alumni.nis_nim ?? '—'}</p>
              </div>
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onDelete}
        loading={deleteResponse.isPending}
        title="Hapus Respons"
        message="Respons ini akan dihapus dari data. Alumni dapat mengisi ulang jika survey masih aktif."
      />
    </div>
  )
}
