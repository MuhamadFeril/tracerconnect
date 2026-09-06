import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Layers,
  MessageSquareText,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Undo2,
} from 'lucide-react'
import { apiError } from '../lib/api'
import { useCreateSurvey, useDeleteSurvey, usePublishSurvey, useSurveys, useInstitutionOptions } from '../hooks/queries'
import { formatDate } from '../lib/format'
import type { Survey } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function CreateSurveyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSurvey()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: institutions, isLoading } = useInstitutionOptions()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [institutionId, setInstitutionId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const survey = await create.mutateAsync({
        title,
        description: description || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        institution_id: institutionId,
      })
      toast('Survey berhasil dibuat')
      onClose()
      navigate(`/surveys/${survey.id}/builder`)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Survey Baru"
      description="Survey dibuat sebagai draft, lalu publikasikan setelah disusun."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Batal</Button>
          <Button type="submit" form="survey-form" loading={create.isPending}>Buat & Susun</Button>
        </>
      }
    >
      <form id="survey-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <Field label="Judul Survey" required>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Tracer Study Lulusan 2026" />
        </Field>
        <Field label="Deskripsi">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Penjelasan singkat untuk alumni" />
        </Field>
        <Field label="Institusi">
          <Select
            value={institutionId ?? ''}
            onChange={(e) => setInstitutionId(e.target.value === '' ? undefined : e.target.value)}
            disabled={isLoading}
          >
            <option value="">—Pilih institusi—</option>
            {institutions?.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mulai Aktif">
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Berakhir">
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export function SurveyList() {
  const { data, isPending, isError, refetch } = useSurveys({ page: 1 })
  const publish = usePublishSurvey()
  const deleteSurvey = useDeleteSurvey()
  const toast = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<Survey | null>(null)

  const surveys = data?.data ?? []

  const onTogglePublish = async (s: Survey) => {
    try {
      await publish.mutateAsync({ id: s.id, publish: s.status !== 'published' })
      toast(s.status === 'published' ? 'Survey dikembalikan ke draft' : 'Survey berhasil dipublikasikan')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surveys"
        subtitle="Susun kuesioner tracer study dan kelola publikasi"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Buat Survey
          </Button>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat survey" onRetry={() => refetch()} />
      ) : surveys.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada survey"
            description="Buat survey pertama untuk mulai mengumpulkan data tracer study."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Buat Survey
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {surveys.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                    <MessageSquareText className="size-5 text-indigo-600" />
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{s.title}</h3>
                {s.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.description}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge tone="indigo">v{s.version}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3.5" /> {s.questions_count ?? 0} pertanyaan
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {s.expires_at ? `Berakhir ${formatDate(s.expires_at)}` : 'Tanpa batas waktu'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
                <Link
                  to={`/surveys/${s.id}/builder`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700"
                >
                  <Pencil className="size-3.5" /> Susun
                </Link>
                <Button
                  variant={s.status === 'published' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => onTogglePublish(s)}
                  loading={publish.isPending}
                  title={s.status === 'published' ? 'Kembalikan ke draft' : 'Publikasikan'}
                >
                  {s.status === 'published' ? <Undo2 className="size-4" /> : <Rocket className="size-4" />}
                </Button>
                <button
                  onClick={() => setDeleting(s)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Hapus"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateSurveyModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteSurvey.mutateAsync(deleting.id)
            toast('Survey berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={deleteSurvey.isPending}
        title="Hapus Survey"
        message={
          <>
            Survey <span className="font-semibold text-slate-800">{deleting?.title}</span> beserta seluruh
            pertanyaan dan responsnya akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </>
        }
      />
    </div>
  )
}
