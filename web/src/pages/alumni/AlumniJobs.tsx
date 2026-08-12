import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react'
import clsx from 'clsx'
import { apiError } from '../../lib/api'
import {
  useApplyJob,
  useJobVacancies,
  useSaveJob,
  useUnsaveJob,
} from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import type { JobVacancy } from '../../lib/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

const TYPE_TONES: Record<string, 'indigo' | 'sky' | 'violet' | 'amber' | 'slate'> = {
  full_time: 'indigo',
  part_time: 'sky',
  internship: 'violet',
  contract: 'amber',
  freelance: 'slate',
}

function ApplyJobModal({
  job,
  onClose,
}: {
  job: JobVacancy | null
  onClose: () => void
}) {
  const toast = useToast()
  const apply = useApplyJob()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (job) {
      setMessage('')
      setError(null)
    }
  }, [job])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return
    setError(null)
    try {
      await apply.mutateAsync({ jobId: job.id, message: message.trim() || undefined })
      toast('Lamaran berhasil dikirim')
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={Boolean(job)}
      onClose={onClose}
      title="Kirim Lamaran"
      description={job ? `${job.title} — ${job.company_name}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={apply.isPending}>
            Batal
          </Button>
          <Button type="submit" form="apply-job-form" loading={apply.isPending}>
            <Send className="size-4" /> Kirim Lamaran
          </Button>
        </>
      }
    >
      <form id="apply-job-form" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
            {(job?.company_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{job?.title}</p>
            <p className="truncate text-xs text-slate-500">{job?.company_name}</p>
            {job?.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="size-3" /> {job.location}
              </p>
            )}
          </div>
        </div>
        <Field label="Pesan untuk Perusahaan" hint="Opsional — jelaskan mengapa Anda cocok untuk posisi ini">
          <Textarea
            name="message"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Perkenalkan diri Anda, pengalaman, dan alasan melamar…"
          />
        </Field>
        <p className="text-xs leading-relaxed text-slate-400">
          Lamaran Anda akan dikirim ke pengelola institusi untuk ditinjau. Status lamaran dapat
          dipantau di halaman <Link to="/lamaran" className="font-medium text-indigo-600 hover:text-indigo-500">Lamaran Saya</Link>.
        </p>
      </form>
    </Modal>
  )
}

export function AlumniJobs() {
  const [page, setPage] = useState(1)
  const [applyingTo, setApplyingTo] = useState<JobVacancy | null>(null)

  const { data, isPending, isError, refetch } = useJobVacancies({ page })
  const saveJob = useSaveJob()
  const unsaveJob = useUnsaveJob()
  const toast = useToast()

  const rows = data?.data ?? []
  const busyJobId = saveJob.isPending ? saveJob.variables : unsaveJob.isPending ? unsaveJob.variables : null

  const toggleSave = async (job: JobVacancy) => {
    try {
      if (job.is_saved) {
        await unsaveJob.mutateAsync(job.id)
        toast('Lowongan dihapus dari tersimpan')
      } else {
        await saveJob.mutateAsync(job.id)
        toast('Lowongan disimpan')
      }
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lowongan Kerja"
        subtitle="Simpan lowongan favorit dan kirim lamaran langsung dari sini"
        actions={
          <Link
            to="/lamaran"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Briefcase className="size-4" /> Lamaran Saya
          </Link>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat lowongan" onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada lowongan" description="Belum ada lowongan kerja dari institusi Anda." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map((job) => {
              const busy = busyJobId === job.id
              return (
                <Card key={job.id} className="flex flex-col p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
                      {(job.company_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold text-slate-900">{job.title}</h2>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{job.company_name}</p>
                    </div>
                    <button
                      onClick={() => toggleSave(job)}
                      disabled={busy}
                      title={job.is_saved ? 'Hapus dari tersimpan' : 'Simpan lowongan'}
                      className={clsx(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                        job.is_saved
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500',
                      )}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : job.is_saved ? (
                        <BookmarkCheck className="size-4.5" />
                      ) : (
                        <Bookmark className="size-4.5" />
                      )}
                    </button>
                  </div>

                  {job.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{job.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {job.employment_type && (
                      <Badge tone={TYPE_TONES[job.employment_type] ?? 'slate'}>
                        {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                      </Badge>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3.5" /> {job.location}
                      </span>
                    )}
                    {job.has_applied && (
                      <Badge tone="green">✓ Sudah Dilamar</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-[11px] text-slate-400">
                      {job.posted_at ? `Diposting ${formatDate(job.posted_at)}` : 'Baru diposting'}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {job.application_link && (
                        <a
                          href={job.application_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buka tautan lamaran eksternal"
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                        >
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      )}
                      {job.has_applied ? (
                        <Link
                          to="/lamaran"
                          className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                        >
                          Lihat Status
                        </Link>
                      ) : (
                        <button
                          onClick={() => setApplyingTo(job)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          <Send className="size-3.5" /> Lamar
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      <ApplyJobModal job={applyingTo} onClose={() => setApplyingTo(null)} />
    </div>
  )
}
