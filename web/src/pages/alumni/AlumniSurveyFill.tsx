import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  CheckCircle2,
  PencilLine,
  Save,
  Send,
  Star,
} from 'lucide-react'
import { apiError } from '../../lib/api'
import {
  useEditSurvey,
  useMyResponses,
  useSaveAnswers,
  useStartSurvey,
  useSubmitAnswers,
} from '../../hooks/queries'
import type { Question, QuestionOption } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'
import { AlumniAnswerSummary, isQuestionVisible } from './AlumniAnswerSummary'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const optionValue = (option: QuestionOption): string => option.value ?? option.label

function parseValidationError(error: unknown): { top: string | null; fields: Record<string, string> } {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors as
      | Record<string, string[] | string>
      | undefined
    if (errors && Object.keys(errors).length > 0) {
      const fields: Record<string, string> = {}
      const top: string[] = []
      for (const [key, value] of Object.entries(errors)) {
        const message = Array.isArray(value) ? value[0] ?? '' : String(value)
        if (key.startsWith('answers.')) {
          fields[key.replace('answers.', '')] = message
        } else {
          top.push(message)
        }
      }
      return { top: top[0] ?? null, fields }
    }
    return {
      top: (error.response?.data as { message?: string } | undefined)?.message ?? 'Terjadi kesalahan',
      fields: {},
    }
  }
  return { top: 'Terjadi kesalahan', fields: {} }
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/* ------------------------------------------------------------------ */
/* Question input per type                                             */
/* ------------------------------------------------------------------ */

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
}) {
  // Per-question validation errors are rendered by the parent (QuestionBlock).

  switch (question.type) {
    case 'textarea':
      return (
        <Textarea
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis jawaban Anda…"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'dropdown':
      return (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Pilih salah satu —</option>
          {(question.options ?? []).map((option) => (
            <option key={option.id ?? option.label} value={optionValue(option)}>
              {option.label}
            </option>
          ))}
        </Select>
      )

    case 'single_choice':
    case 'yes_no': {
      const options =
        question.type === 'yes_no'
          ? [
              { id: 'yes', label: 'Ya', value: 'yes' },
              { id: 'no', label: 'Tidak', value: 'no' },
            ]
          : question.options ?? []

      return (
        <div className="space-y-2">
          {options.map((option) => {
            const optionId = option.id ?? option.label
            const checked = String(value ?? '') === String(optionValue(option as QuestionOption))
            return (
              <label
                key={optionId}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={checked}
                  onChange={() => onChange(optionValue(option as QuestionOption))}
                  className="size-4 accent-indigo-600"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            )
          })}
        </div>
      )
    }

    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value.map(String) : []
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((option) => {
            const optionId = option.id ?? option.label
            const checked = selected.includes(String(optionValue(option)))
            const toggle = () =>
              onChange(
                checked
                  ? selected.filter((v) => v !== String(optionValue(option)))
                  : [...selected, String(optionValue(option))],
              )
            return (
              <label
                key={optionId}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={toggle}
                  className="size-4 accent-indigo-600"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            )
          })}
        </div>
      )
    }

    case 'rating':
    case 'scale': {
      const max = question.settings?.max ?? 5
      const current = Number(value) || 0
      return (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              aria-label={`Nilai ${n}`}
              className={
                n <= current
                  ? 'flex size-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100'
                  : 'flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-amber-300 hover:text-amber-500'
              }
            >
              <Star className="size-4.5 fill-current" />
            </button>
          ))}
          <span className="ml-2 text-xs text-slate-400">
            {current > 0 ? `${current} dari ${max}` : 'Pilih nilai'}
          </span>
        </div>
      )
    }

    case 'file':
      return (
        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tempel tautan file atau tulis deskripsi singkat"
        />
      )

    default:
      return (
        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik jawaban Anda…"
        />
      )
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AlumniSurveyFill() {
  const { surveyId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const start = useStartSurvey(surveyId)
  const save = useSaveAnswers(surveyId)
  const submit = useSubmitAnswers(surveyId)

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [initialized, setInitialized] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [topError, setTopError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fill = start.data

  // Load saved answers once per response (resume / start).
  useEffect(() => {
    if (fill && initialized !== fill.id) {
      setAnswers(fill.answers ?? {})
      setInitialized(fill.id)
      setFields({})
      setTopError(null)
    }
  }, [fill, initialized])

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setFields((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  const allQuestions = useMemo(() => {
    const fromSections = (fill?.survey.sections ?? []).flatMap((section) => section.questions)
    const unassigned = fill?.survey.questions ?? []
    return [...fromSections, ...unassigned]
  }, [fill])

  const visibleQuestions = useMemo(
    () => allQuestions.filter((question) => isQuestionVisible(question, answers)),
    [allQuestions, answers],
  )

  const answeredCount = visibleQuestions.filter((question) => !isEmptyValue(answers[question.id])).length
  const progress =
    visibleQuestions.length === 0 ? 0 : Math.round((answeredCount / visibleQuestions.length) * 100)

  const buildPayload = () =>
    Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))

  const onSave = async () => {
    setTopError(null)
    try {
      await save.mutateAsync(buildPayload())
      toast('Draft jawaban berhasil disimpan')
    } catch (err) {
      const parsed = parseValidationError(err)
      setFields(parsed.fields)
      setTopError(parsed.top)
    }
  }

  const onSubmit = async () => {
    setTopError(null)
    try {
      await submit.mutateAsync(buildPayload())
      setConfirmOpen(false)
      toast('Respons berhasil dikirim. Terima kasih!')
    } catch (err) {
      setConfirmOpen(false)
      const parsed = parseValidationError(err)
      setFields(parsed.fields)
      setTopError(parsed.top)
    }
  }

  // Direct navigation to a survey that was already submitted (refresh, back
  // button, stale link): POST /start refuses with 'sudah mengisi'. Surface a
  // friendly screen instead of a raw error, with a link to the collected
  // answers when we can find the response id.
  const alreadySubmitted = Boolean(
    start.isError && apiError(start.error).toLowerCase().includes('sudah mengisi'),
  )
  const history = useMyResponses({ page: 1, per_page: 100 }, { enabled: alreadySubmitted })
  const submittedResponse = history.data?.data.find((r) => r.survey?.id === surveyId)
  const edit = useEditSurvey(surveyId)

  if (alreadySubmitted) {
    // Direct navigation to a survey the user already submitted while it is
    // still open: they can reopen it and update their answers.
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Anda sudah mengisi survey ini
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Jawaban Anda telah terkumpul. Selama kuisioner masih terbuka, Anda dapat
            memperbarui jawaban (misalnya jika ada kesalahan atau Anda mendapat pekerjaan baru).
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              loading={edit.isPending}
              onClick={async () => {
                try {
                  await edit.mutateAsync()
                  // The response is back to in_progress — reload the form
                  // pre-filled with the saved answers.
                  await start.refetch()
                } catch {
                  // fall through: form stays on this screen and the error is
                  // surfaced by refetching history below.
                }
              }}
            >
              <PencilLine className="size-4" /> Perbarui Jawaban
            </Button>
            {submittedResponse && (
              <Button variant="secondary" onClick={() => navigate(`/kuisioner/hasil/${submittedResponse.id}`)}>
                <CheckCircle2 className="size-4" /> Lihat Jawaban Saya
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/kuisioner')}>
              <ArrowLeft className="size-4" /> Kembali ke Kuisioner
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (start.isPending) return <LoadingState label="Menyiapkan kuisioner…" />
  if (start.isError || !fill) {
    return (
      <ErrorState
        message={start.isError ? apiError(start.error) : 'Kuisioner tidak ditemukan'}
        onRetry={start.isError ? () => start.refetch() : undefined}
      />
    )
  }

  // Submitted view: thank-you card followed by the read-only answer summary.
  if (fill.status === 'submitted') {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Terima kasih!</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Respons Anda untuk <span className="font-semibold text-slate-700">{fill.survey.title}</span>{' '}
            telah berhasil dikirim{fill.submitted_at ? ` pada ${formatDateTime(fill.submitted_at)}` : ''}.
            Data Anda membantu institusi meningkatkan kualitas pembelajaran.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/kuisioner')}>
              <ArrowLeft className="size-4" /> Kembali ke Kuisioner
            </Button>
            <Button onClick={() => navigate('/home')}>Ke Beranda</Button>
          </div>
        </Card>

        <Card className="px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan Jawaban Anda</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Dikirim pada {formatDateTime(fill.submitted_at)} · hanya-baca
          </p>
        </Card>

        <AlumniAnswerSummary fill={fill} />
      </div>
    )
  }

  const sections = fill.survey.sections ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/kuisioner"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="size-3.5" /> Daftar Kuisioner
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{fill.survey.title}</h1>
            {fill.survey.description && (
              <p className="mt-1 text-sm text-slate-500">{fill.survey.description}</p>
            )}
          </div>
          <div className="w-40 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Progres</span>
              <span className="font-medium text-slate-700">
                {answeredCount}/{visibleQuestions.length} ({progress}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {topError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {topError}
        </div>
      )}

      <form
        id="survey-form"
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          setConfirmOpen(true)
        }}
      >
        {sections.map((section) => {
          const visible = section.questions.filter((question) => isQuestionVisible(question, answers))
          if (visible.length === 0) return null
          return (
            <Card key={section.id}>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
                {section.description && (
                  <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>
                )}
              </div>
              <div className="space-y-5 px-5 py-4">
                {visible.map((question) => (
                  <QuestionBlock
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    error={fields[question.id]}
                    onChange={(value) => setAnswer(question.id, value)}
                  />
                ))}
              </div>
            </Card>
          )
        })}

        {allQuestions.filter((q) => !q.section_id && isQuestionVisible(q, answers)).length > 0 && (
          <Card>
            <div className="space-y-5 px-5 py-4">
              {allQuestions
                .filter((q) => !q.section_id && isQuestionVisible(q, answers))
                .map((question) => (
                  <QuestionBlock
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    error={fields[question.id]}
                    onChange={(value) => setAnswer(question.id, value)}
                  />
                ))}
            </div>
          </Card>
        )}

        {visibleQuestions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-sm text-slate-500">
            Survei ini belum memiliki pertanyaan yang tampil untuk Anda.
          </p>
        ) : (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="mr-auto hidden text-xs text-slate-400 sm:block">
            Jawaban tersimpan otomatis saat Anda menekan Simpan Draft.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onSave}
            loading={save.isPending}
            disabled={submit.isPending}
          >
            <Save className="size-4" /> Simpan Draft
          </Button>
          <Button type="submit" loading={submit.isPending} disabled={save.isPending}>
            <Send className="size-4" /> Kumpulkan Jawaban
          </Button>
        </div>
        )}
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onSubmit}
        loading={submit.isPending}
        title="Kumpulkan Jawaban"
        message="Setelah dikumpulkan, jawaban tidak dapat diubah lagi. Lanjutkan?"
        confirmLabel="Ya, Kumpulkan"
      />
    </div>
  )
}

function QuestionBlock({
  question,
  value,
  error,
  onChange,
}: {
  question: Question
  value: unknown
  error?: string
  onChange: (value: unknown) => void
}) {
  return (
    <div>
      <Field
        label={question.label}
        required={question.is_required}
        hint={question.help_text ?? undefined}
        error={error}
      >
        <QuestionInput question={question} value={value} onChange={onChange} />
      </Field>
    </div>
  )
}
