import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Lock,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Undo2,
} from 'lucide-react'
import { apiError } from '../lib/api'
import {
  useCreateQuestion,
  useCreateSection,
  useDeleteQuestion,
  useDeleteSection,
  usePublishSurvey,
  useReorderSurvey,
  useSurvey,
  useUpdateQuestion,
  useUpdateSection,
  useDeleteSurvey,
} from '../hooks/queries'
import { QUESTION_TYPE_LABELS, formatDate } from '../lib/format'
import type { Question, QuestionPayload, SurveyDetail, SurveySection } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

interface OptionRow {
  label: string
  value: string
}

interface ConditionRow {
  condition_question_id: string
  operator: 'equals' | 'not_equals'
  value: string
}

interface QuestionForm {
  type: string
  label: string
  help_text: string
  is_required: boolean
  max: string
  options: OptionRow[]
  conditions: ConditionRow[]
}

const CHOICE_TYPES = ['single_choice', 'multiple_choice', 'dropdown']

function initialQuestionForm(question: Question | null): QuestionForm {
  return question
    ? {
        type: question.type,
        label: question.label,
        help_text: question.help_text ?? '',
        is_required: question.is_required,
        max: String(question.settings?.max ?? 5),
        options: ((question.options ?? []).length
          ? question.options
          : [{ label: '', value: '' }]
        ).map((o) => ({ label: o.label, value: o.value ?? '' })),
        conditions: (question.conditions ?? []).map((c) => ({
          condition_question_id: c.condition_question_id,
          operator: c.operator,
          value: c.value ?? '',
        })),
      }
    : {
        type: 'text',
        label: '',
        help_text: '',
        is_required: false,
        max: '5',
        options: [{ label: '', value: '' }],
        conditions: [],
      }
}

function QuestionFormModal({
  open,
  onClose,
  survey,
  sectionId,
  question,
  locked,
}: {
  open: boolean
  onClose: () => void
  survey: SurveyDetail
  sectionId: string | null
  question: Question | null
  locked: boolean
}) {
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<QuestionForm>(() => initialQuestionForm(question))

  // Reset the form every time the modal opens (the modal stays mounted).
  useEffect(() => {
    if (open) {
      setForm(initialQuestionForm(question))
      setError(null)
    }
  }, [open, question])

  const set = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Flat list of every question in the survey (sections + unassigned).
  const allQuestions = useMemo(
    () => [...survey.sections.flatMap((s) => s.questions), ...survey.questions],
    [survey],
  )

  const triggerOptions = useMemo(() => {
    if (form.conditions.length === 0) return []
    const triggerId = form.conditions[0].condition_question_id
    return allQuestions.find((q) => q.id === triggerId)?.options ?? []
  }, [form.conditions, allQuestions])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload: QuestionPayload = {
      section_id: sectionId,
      type: form.type,
      label: form.label,
      help_text: form.help_text || null,
      is_required: form.is_required,
      settings: form.type === 'rating' || form.type === 'scale' ? { max: Number(form.max) || 5 } : null,
      options:
        form.type === 'single_choice' || form.type === 'multiple_choice' || form.type === 'dropdown'
          ? form.options.filter((o) => o.label.trim()).map((o) => ({ label: o.label, value: o.value || null }))
          : [],
      conditions: form.conditions
        .filter((c) => c.condition_question_id)
        .map((c) => ({ condition_question_id: c.condition_question_id, operator: c.operator, value: c.value || null })),
    }

    try {
      if (question) {
        await updateQuestion.mutateAsync({ questionId: question.id, surveyId: survey.id, payload })
        toast('Pertanyaan berhasil diperbarui')
      } else {
        await createQuestion.mutateAsync({ surveyId: survey.id, payload })
        toast('Pertanyaan berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={question ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
      description={question ? 'Ubah pengaturan pertanyaan' : 'Tambah pertanyaan baru ke section'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createQuestion.isPending || updateQuestion.isPending}>
            Batal
          </Button>
          <Button type="submit" form="question-form" loading={createQuestion.isPending || updateQuestion.isPending}>
            {question ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="question-form" onSubmit={onSubmit} className="space-y-4">
        {locked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            Survey sudah dipublikasikan. Struktur tidak dapat diubah — kembalikan ke draft terlebih dahulu.
          </div>
        )}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipe Pertanyaan" required>
            <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          {(form.type === 'rating' || form.type === 'scale') && (
            <Field label="Skala Maksimum">
              <Input type="number" min={2} max={10} value={form.max} onChange={(e) => set('max', e.target.value)} />
            </Field>
          )}
        </div>

        <Field label="Pertanyaan" required>
          <Input required value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Teks pertanyaan" />
        </Field>
        <Field label="Bantuan / Petunjuk">
          <Input value={form.help_text} onChange={(e) => set('help_text', e.target.value)} placeholder="Opsional" />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_required}
            onChange={(e) => set('is_required', e.target.checked)}
            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Wajib diisi
        </label>

        {CHOICE_TYPES.includes(form.type) && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Pilihan Jawaban</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => set('options', [...form.options, { label: '', value: '' }])}>
                <Plus className="size-4" /> Tambah
              </Button>
            </div>
            {form.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => {
                    const next = [...form.options]
                    next[index] = { ...next[index], label: e.target.value }
                    set('options', next)
                  }}
                  placeholder="Label (contoh: Ya)"
                />
                <Input
                  value={option.value}
                  onChange={(e) => {
                    const next = [...form.options]
                    next[index] = { ...next[index], value: e.target.value }
                    set('options', next)
                  }}
                  placeholder="Nilai (opsional)"
                />
                <button
                  type="button"
                  onClick={() => set('options', form.options.filter((_, i) => i !== index))}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Logika Kondisi</p>
              <p className="text-xs text-slate-400">Pertanyaan hanya muncul jika kondisi terpenuhi</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                set('conditions', [
                  ...form.conditions,
                  { condition_question_id: '', operator: 'equals', value: '' },
                ])
              }
            >
              <Plus className="size-4" /> Tambah
            </Button>
          </div>
          {form.conditions.length === 0 && <p className="text-xs text-slate-400">Selalu ditampilkan</p>}
          {form.conditions.map((condition, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Select
                  value={condition.condition_question_id}
                  onChange={(e) => {
                    const next = [...form.conditions]
                    next[index] = { ...next[index], condition_question_id: e.target.value }
                    set('conditions', next)
                  }}
                >
                  <option value="">— Pilih pertanyaan pemicu —</option>
                  {allQuestions
                    .filter((q) => q.id !== question?.id)
                    .map((q) => (
                      <option key={q.id} value={q.id}>{q.label}</option>
                    ))}
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Select
                  value={condition.operator}
                  onChange={(e) => {
                    const next = [...form.conditions]
                    next[index] = { ...next[index], operator: e.target.value as 'equals' | 'not_equals' }
                    set('conditions', next)
                  }}
                >
                  <option value="equals">sama dengan</option>
                  <option value="not_equals">tidak sama dengan</option>
                </Select>
              </div>
              <div className="sm:col-span-3">
                {triggerOptions.length > 0 ? (
                  <Select
                    value={condition.value}
                    onChange={(e) => {
                      const next = [...form.conditions]
                      next[index] = { ...next[index], value: e.target.value }
                      set('conditions', next)
                    }}
                  >
                    <option value="">— Nilai —</option>
                    {triggerOptions.map((o) => (
                      <option key={o.id} value={o.value ?? o.label}>{o.label}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={condition.value}
                    onChange={(e) => {
                      const next = [...form.conditions]
                      next[index] = { ...next[index], value: e.target.value }
                      set('conditions', next)
                    }}
                    placeholder="Nilai jawaban"
                  />
                )}
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={() => set('conditions', form.conditions.filter((_, i) => i !== index))}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  )
}

function SectionFormModal({
  open,
  onClose,
  surveyId,
  section,
  locked,
}: {
  open: boolean
  onClose: () => void
  surveyId: string
  section: SurveySection | null
  locked: boolean
}) {
  const createSection = useCreateSection()
  const updateSection = useUpdateSection()
  const toast = useToast()
  const [title, setTitle] = useState(section?.title ?? '')
  const [description, setDescription] = useState(section?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  // Reset the form every time the modal opens (the modal stays mounted).
  useEffect(() => {
    if (open) {
      setTitle(section?.title ?? '')
      setDescription(section?.description ?? '')
      setError(null)
    }
  }, [open, section])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (section) {
        await updateSection.mutateAsync({ section, payload: { title, description: description || null } })
        toast('Section berhasil diperbarui')
      } else {
        await createSection.mutateAsync({ surveyId, payload: { title, description: description || null } })
        toast('Section berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? 'Edit Section' : 'Tambah Section'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createSection.isPending || updateSection.isPending}>Batal</Button>
          <Button type="submit" form="section-form" loading={createSection.isPending || updateSection.isPending}>Simpan</Button>
        </>
      }
    >
      <form id="section-form" onSubmit={onSubmit} className="space-y-4">
        {locked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            Survey sudah dipublikasikan — kembalikan ke draft untuk mengubah section.
          </div>
        )}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <Field label="Judul Section">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Informasi Pekerjaan" />
        </Field>
        <Field label="Deskripsi">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}

function QuestionRow({
  question,
  allQuestions,
  locked,
  onEdit,
  onDelete,
  onMove,
}: {
  question: Question
  allQuestions: Question[]
  locked: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-200">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-800">{question.label}</p>
          {question.is_required && <Badge tone="rose">Wajib</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="indigo">{QUESTION_TYPE_LABELS[question.type] ?? question.type}</Badge>
          {question.help_text && <span className="text-xs text-slate-400">{question.help_text}</span>}
          {(question.options ?? []).length > 0 && (
            <span className="text-xs text-slate-400">{(question.options ?? []).length} pilihan</span>
          )}
          {(question.conditions ?? []).map((c, i) => {
            const trigger = allQuestions.find((q) => q.id === c.condition_question_id)
            return (
              <Badge key={i} tone="violet">
                Jika {trigger?.label ?? '?'} {c.operator === 'not_equals' ? '≠' : '='} {c.value ?? ''}
              </Badge>
            )
          })}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={() => onMove(-1)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Naik"
          disabled={locked}
        >
          <ArrowUp className="size-4" />
        </button>
        <button
          onClick={() => onMove(1)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Turun"
          disabled={locked}
        >
          <ArrowDown className="size-4" />
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
          title="Edit"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title="Hapus"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function SurveyBuilder() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: survey, isPending, isError, refetch } = useSurvey(id)
  const publish = usePublishSurvey()
  const deleteSurvey = useDeleteSurvey()
  const deleteSection = useDeleteSection()
  const deleteQuestion = useDeleteQuestion()
  const reorder = useReorderSurvey()
  const toast = useToast()

  const [sectionModal, setSectionModal] = useState<{ open: boolean; section: SurveySection | null }>({ open: false, section: null })
  const [questionModal, setQuestionModal] = useState<{ open: boolean; sectionId: string | null; question: Question | null }>({ open: false, sectionId: null, question: null })
  const [confirm, setConfirm] = useState<{
    type: 'survey' | 'section' | 'question'
    label: string
    target: SurveySection | Question | null
  } | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const locked = survey?.status === 'published'

  const sortedSections = useMemo(() => [...(survey?.sections ?? [])].sort((a, b) => a.order - b.order), [survey])
  const unassigned = useMemo(
    () => [...(survey?.questions ?? [])].sort((a, b) => a.order - b.order),
    [survey],
  )
  const allQuestions = useMemo(
    () => [...sortedSections.flatMap((s) => s.questions), ...unassigned],
    [sortedSections, unassigned],
  )

  if (isPending) return <LoadingState label="Memuat builder…" />
  if (isError || !survey) return <ErrorState message="Gagal memuat survey" onRetry={() => refetch()} />

  const moveSection = (section: SurveySection, direction: -1 | 1) => {
    const next = sortedSections
      .map((s, i) => (s.id === section.id ? { ...s, order: i + direction } : s))
      .sort((a, b) => a.order - b.order)
    reorder.mutate({
      surveyId: survey.id,
      payload: { sections: next.map((s, i) => ({ id: s.id, order: i + 1 })) },
    })
  }

  const moveQuestion = (question: Question, siblings: Question[], direction: -1 | 1) => {
    const next = siblings
      .map((q, i) => (q.id === question.id ? { ...q, order: i + direction } : q))
      .sort((a, b) => a.order - b.order)
    reorder.mutate({
      surveyId: survey.id,
      payload: { questions: next.map((q, i) => ({ id: q.id, order: i + 1 })) },
    })
  }

  const togglePublish = async () => {
    try {
      await publish.mutateAsync({ id: survey.id, publish: locked })
      toast(locked ? 'Survey dikembalikan ke draft' : 'Survey berhasil dipublikasikan')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const executeConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.type === 'survey') {
        await deleteSurvey.mutateAsync(survey.id)
        toast('Survey berhasil dihapus')
        navigate('/surveys')
      } else if (confirm.type === 'section' && confirm.target) {
        await deleteSection.mutateAsync(confirm.target as SurveySection)
        toast('Section berhasil dihapus')
      } else if (confirm.type === 'question' && confirm.target) {
        await deleteQuestion.mutateAsync(confirm.target as Question)
        toast('Pertanyaan berhasil dihapus')
      }
      setConfirm(null)
    } catch (err) {
      toast(apiError(err), 'error')
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/surveys" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
        <ArrowLeft className="size-4" /> Semua Survey
      </Link>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{survey.title}</h1>
              <StatusBadge status={survey.status} />
              <Badge tone="indigo">v{survey.version}</Badge>
            </div>
            {survey.description && <p className="mt-1 text-sm text-slate-500">{survey.description}</p>}
            <p className="mt-1 text-xs text-slate-400">
              {survey.starts_at ? `Mulai ${formatDate(survey.starts_at)}` : 'Tanpa jadwal mulai'}
              {' · '}
              {survey.expires_at ? `Berakhir ${formatDate(survey.expires_at)}` : 'Tanpa batas waktu'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={locked ? 'secondary' : 'primary'} onClick={togglePublish} loading={publish.isPending}>
              {locked ? <Undo2 className="size-4" /> : <Rocket className="size-4" />}
              {locked ? 'Kembalikan ke Draft' : 'Publikasikan'}
            </Button>
          </div>
        </div>
        {locked && (
          <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-6 py-2.5 text-xs text-amber-700">
            <Lock className="size-3.5" />
            Survey sedang dipublikasikan — struktur terkunci. Kembalikan ke draft untuk mengubah pertanyaan.
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {sortedSections.map((section) => {
          const isCollapsed = collapsed[section.id]
          const questions = [...section.questions].sort((a, b) => a.order - b.order)

          return (
            <Card key={section.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                  >
                    {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{section.title ?? 'Tanpa Judul'}</p>
                    {section.description && <p className="truncate text-xs text-slate-400">{section.description}</p>}
                  </div>
                  <Badge>{questions.length} pertanyaan</Badge>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => moveSection(section, -1)}
                    disabled={locked}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                    title="Naik"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    onClick={() => moveSection(section, 1)}
                    disabled={locked}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                    title="Turun"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    onClick={() => setSectionModal({ open: true, section })}
                    disabled={locked}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                    title="Edit section"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setConfirm({ type: 'section', label: section.title ?? 'Section', target: section })}
                    disabled={locked}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    title="Hapus section"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-2.5 p-4">
                  {questions.length === 0 && (
                    <p className="py-2 text-center text-xs text-slate-400">Belum ada pertanyaan di section ini.</p>
                  )}
                  {questions.map((q) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      allQuestions={allQuestions}
                      locked={locked}
                      onEdit={() => setQuestionModal({ open: true, sectionId: section.id, question: q })}
                      onDelete={() => setConfirm({ type: 'question', label: q.label, target: q })}
                      onMove={(direction) => moveQuestion(q, questions, direction)}
                    />
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={locked}
                    onClick={() => setQuestionModal({ open: true, sectionId: section.id, question: null })}
                  >
                    <Plus className="size-4" /> Tambah Pertanyaan
                  </Button>
                </div>
              )}
            </Card>
          )
        })}

        {unassigned.length > 0 && (
          <Card>
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-sm font-semibold text-slate-900">Tanpa Section</p>
            </div>
            <div className="space-y-2.5 p-4">
              {unassigned.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  allQuestions={allQuestions}
                  locked={locked}
                  onEdit={() => setQuestionModal({ open: true, sectionId: null, question: q })}
                  onDelete={() => setConfirm({ type: 'question', label: q.label, target: q })}
                  onMove={(direction) => moveQuestion(q, unassigned, direction)}
                />
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={locked}
            onClick={() => setSectionModal({ open: true, section: null })}
          >
            <Plus className="size-4" /> Tambah Section
          </Button>
          <Button
            variant="secondary"
            disabled={locked}
            onClick={() => setQuestionModal({ open: true, sectionId: null, question: null })}
          >
            <Plus className="size-4" /> Tambah Pertanyaan Tanpa Section
          </Button>
          <div className="ml-auto">
            <Button variant="ghost" onClick={() => setConfirm({ type: 'survey', label: survey.title, target: null })}>
              <Trash2 className="size-4" /> Hapus Survey
            </Button>
          </div>
        </div>
      </div>

      <SectionFormModal
        key={sectionModal.section?.id ?? 'new-section'}
        open={sectionModal.open}
        onClose={() => setSectionModal({ open: false, section: null })}
        surveyId={survey.id}
        section={sectionModal.section}
        locked={locked}
      />

      <QuestionFormModal
        key={questionModal.question?.id ?? 'new-question'}
        open={questionModal.open}
        onClose={() => setQuestionModal({ open: false, sectionId: null, question: null })}
        survey={survey}
        sectionId={questionModal.sectionId}
        question={questionModal.question}
        locked={locked}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={executeConfirm}
        loading={deleteSurvey.isPending || deleteSection.isPending || deleteQuestion.isPending}
        title={
          confirm?.type === 'survey' ? 'Hapus Survey'
          : confirm?.type === 'section' ? 'Hapus Section'
          : 'Hapus Pertanyaan'
        }
        message={
          confirm?.type === 'question' ? (
            <>
              Pertanyaan <span className="font-semibold text-slate-800">“{confirm.label}”</span> akan dihapus
              beserta jawabannya pada respons yang sudah ada.
            </>
          ) : confirm?.type === 'section' ? (
            <>
              Section <span className="font-semibold text-slate-800">“{confirm.label}”</span> akan dihapus.
              Pertanyaan di dalamnya akan dipindahkan ke “Tanpa Section”.
            </>
          ) : (
            <>Survey <span className="font-semibold text-slate-800">“{confirm?.label}”</span> akan dihapus permanen.</>
          )
        }
      />
    </div>
  )
}
