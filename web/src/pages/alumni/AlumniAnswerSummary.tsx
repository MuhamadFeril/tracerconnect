import type { Question, SurveyFill } from '../../lib/types'
import { formatAnswerValue, QUESTION_TYPE_LABELS } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/StateViews'

/**
 * Whether a question should be shown given the current answers. Mirrors the
 * visibility logic used while filling (and the backend's ResponseService).
 */
export function isQuestionVisible(question: Question, answers: Record<string, unknown>): boolean {
  return (question.conditions ?? []).every((condition) => {
    const raw = answers[condition.condition_question_id]
    const trigger = Array.isArray(raw) ? raw.join(',') : String(raw ?? '')
    const matches = trigger === String(condition.value ?? '')
    return condition.operator === 'not_equals' ? !matches : matches
  })
}

function isAnswered(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function AnswerRow({
  question,
  answers,
}: {
  question: Question
  answers: Record<string, unknown>
}) {
  const value = answers[question.id]

  return (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-slate-800">{question.label}</p>
        <Badge tone="indigo">{QUESTION_TYPE_LABELS[question.type] ?? question.type}</Badge>
      </div>
      {isAnswered(value) ? (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {formatAnswerValue(value)}
        </p>
      ) : (
        <p className="mt-1.5 text-sm italic text-slate-400">Tidak dijawab</p>
      )}
    </div>
  )
}

/**
 * Read-only summary of a submitted (or in-progress) response: every
 * currently-visible question grouped by section, with the saved answers.
 */
export function AlumniAnswerSummary({ fill }: { fill: SurveyFill }) {
  const answers = fill.answers ?? {}
  const sections = fill.survey.sections ?? []
  const unassigned = (fill.survey.questions ?? []).filter((q) => isQuestionVisible(q, answers))

  const sectionBlocks = sections
    .map((section) => ({
      section,
      questions: section.questions.filter((q) => isQuestionVisible(q, answers)),
    }))
    .filter((block) => block.questions.length > 0)

  if (sectionBlocks.length === 0 && unassigned.length === 0) {
    return (
      <Card>
        <EmptyState title="Belum ada jawaban" description="Tidak ada jawaban yang tersimpan untuk survey ini." />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {sectionBlocks.map(({ section, questions }) => (
        <Card key={section.id}>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
            {section.description && (
              <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {questions.map((question) => (
              <AnswerRow key={question.id} question={question} answers={answers} />
            ))}
          </div>
        </Card>
      ))}

      {unassigned.length > 0 && (
        <Card>
          <div className="divide-y divide-slate-100">
            {unassigned.map((question) => (
              <AnswerRow key={question.id} question={question} answers={answers} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
