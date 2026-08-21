import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Bookmark, Briefcase, MapPin, MessageCircle, Building2, Check } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useApplyJob,
  useBookmarkJob,
  useJobVacancy,
  useStartConversation,
  useUnbookmarkJob,
} from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { apiError } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

const TYPE_TONES: Record<string, 'indigo' | 'sky' | 'violet' | 'amber' | 'slate'> = {
  full_time: 'indigo',
  part_time: 'sky',
  internship: 'violet',
  contract: 'amber',
  freelance: 'slate',
}

export function AlumniJobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: job, isPending, isError, refetch } = useJobVacancy(id)
  const startChat = useStartConversation()

  const [applyOpen, setApplyOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const apply = useApplyJob(id ?? '')

  const bookmark = useBookmarkJob(id ?? '')
  const unbookmark = useUnbookmarkJob(id ?? '')

  const askRecruiter = async () => {
    if (!job) return
    try {
      const conversation = await startChat.mutateAsync({ job_vacancy_id: job.id })
      navigate(`/chat/${conversation.id}`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const toggleBookmark = async () => {
    if (!job) return
    try {
      if (job.bookmarked) {
        await unbookmark.mutateAsync()
        toast('Lowongan dihapus dari simpanan')
      } else {
        await bookmark.mutateAsync()
        toast('Lowongan disimpan')
      }
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const submitApply = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apply.mutateAsync({ cover_letter: coverLetter.trim() || undefined, cv: cvFile ?? undefined })
      toast('Lamaran berhasil dikirim')
      setApplyOpen(false)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Detail Lowongan"
        subtitle="Informasi lengkap dan cara melamar"
        actions={
          <Link to="/lowongan" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700">
            <ArrowLeft className="size-4" /> Kembali ke daftar
          </Link>
        }
      />

      {isPending ? (
        <LoadingState label="Memuat detail lowongan…" />
      ) : isError || !job ? (
        <ErrorState message="Gagal memuat detail lowongan" onRetry={() => refetch()} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-900 px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white">
                {(job.company_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">{job.title}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-indigo-100">
                  <Building2 className="size-4" /> {job.company_name}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {job.employment_type && (
                <Badge tone={TYPE_TONES[job.employment_type] ?? 'slate'}>
                  {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                </Badge>
              )}
              {job.location && (
                <Badge tone="slate">
                  <MapPin className="size-3.5" /> {job.location}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">Deskripsi</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                {job.description || 'Tidak ada deskripsi untuk lowongan ini.'}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-400">
                {job.posted_at ? `Diposting ${formatDate(job.posted_at)}` : 'Baru diposting'}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {job.created_by && (
                  <Button variant="secondary" onClick={askRecruiter} loading={startChat.isPending}>
                    <MessageCircle className="size-4" /> Tanya Rekruter
                  </Button>
                )}
                <Button variant="secondary" onClick={toggleBookmark} loading={bookmark.isPending || unbookmark.isPending}>
                  {job.bookmarked ? (
                    <>
                      <Check className="size-4" /> Tersimpan
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-4" /> Simpan
                    </>
                  )}
                </Button>
                {job.has_applied ? (
                  <Link
                    to="/applications"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Check className="size-4" /> Sudah Dilamar
                  </Link>
                ) : job.application_link ? (
                  <a
                    href={job.application_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    <Briefcase className="size-4" /> Lamar Sekarang
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : (
                  <Button onClick={() => setApplyOpen(true)}>
                    <Briefcase className="size-4" /> Lamar Lowongan Ini
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Kirim Lamaran"
        description={job ? `Melamar sebagai ${job.title} di ${job.company_name}` : 'Kirim lamaran'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)} disabled={apply.isPending}>
              Batal
            </Button>
            <Button type="submit" form="apply-form" loading={apply.isPending}>
              Kirim Lamaran
            </Button>
          </>
        }
      >
        <form id="apply-form" onSubmit={submitApply} className="space-y-4">
          <Field label="Surat Lamaran" hint="Opsional">
            <Textarea
              name="cover_letter"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Ceritakan singkat mengapa Anda cocok untuk posisi ini…"
            />
          </Field>
          <Field label="CV" hint="Opsional — PDF/DOC/JPG/PNG maks 5 MB">
            <Input type="file" name="cv" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
