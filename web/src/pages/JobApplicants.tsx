import { useState } from 'react'
import { ArrowLeft, Briefcase, Building2, ClipboardCheck, FileText, User, Mail, Phone, MapPin, GraduationCap, BriefcaseBusiness, Heart, Wrench, Eye } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useJobApplicants, useJobVacancy, useSaveAcceptance, useUpdateApplicationStatus } from '../hooks/queries'
import type { JobApplication, JobApplicationStatus } from '../lib/types'
import { EMPLOYMENT_LABELS, formatDate } from '../lib/format'
import { apiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  submitted: 'Diajukan',
  reviewing: 'Direview',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  accepted: 'Diterima',
  rejected: 'Ditolak',
  withdrawn: 'Ditarik',
}

const STATUS_TONES: Record<JobApplicationStatus, 'slate' | 'sky' | 'indigo' | 'violet' | 'green' | 'rose' | 'amber'> = {
  submitted: 'slate',
  reviewing: 'sky',
  shortlisted: 'indigo',
  interview: 'violet',
  accepted: 'green',
  rejected: 'rose',
  withdrawn: 'amber',
}

const CONTRACT_LABELS: Record<string, string> = {
  permanent: 'Permanen',
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Kontrak',
  internship: 'Magang',
}

interface AcceptanceForm {
  position_offered: string
  contract_type: string
  start_date: string
  salary: string
  notes: string
}

function initialAcceptance(app: JobApplication): AcceptanceForm {
  return {
    position_offered: app.acceptance?.position_offered ?? '',
    contract_type: app.acceptance?.contract_type ?? '',
    start_date: app.acceptance?.start_date ?? '',
    salary: app.acceptance?.salary ?? '',
    notes: app.acceptance?.notes ?? '',
  }
}

function StatusSelect({ app }: { app: JobApplication }) {
  const toast = useToast()
  const updateStatus = useUpdateApplicationStatus(app.id)

  const change = async (status: JobApplicationStatus) => {
    try {
      await updateStatus.mutateAsync(status)
      toast('Status lamaran diperbarui')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <Select
      name={`status-${app.id}`}
      value={app.status}
      onChange={(e) => change(e.target.value as JobApplicationStatus)}
      className="h-9 w-36 text-xs"
      disabled={app.status === 'withdrawn'}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  )
}

/** CV Data detail modal */
function CvDataModal({ app, onClose }: { app: JobApplication | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!app) return null
  const cv = app.cv_data
  const info = [
    cv?.full_name && { icon: User, label: 'Nama Lengkap', value: cv.full_name },
    cv?.email && { icon: Mail, label: 'Email', value: cv.email },
    cv?.phone && { icon: Phone, label: 'No. HP', value: cv.phone },
    cv?.gender && { icon: User, label: 'Jenis Kelamin', value: cv.gender === 'male' ? 'Laki-laki' : 'Perempuan' },
    cv?.birthplace && { icon: MapPin, label: 'Tempat Lahir', value: cv.birthplace },
    cv?.birth_date && { icon: MapPin, label: 'Tanggal Lahir', value: cv.birth_date },
    cv?.address && { icon: MapPin, label: 'Alamat', value: cv.address },
    cv?.department && { icon: GraduationCap, label: 'Jurusan', value: cv.department },
    cv?.graduation_year && { icon: GraduationCap, label: 'Tahun Lulus', value: cv.graduation_year },
    cv?.education && { icon: GraduationCap, label: 'Pendidikan', value: cv.education },
    cv?.experience && { icon: BriefcaseBusiness, label: 'Pengalaman Kerja', value: cv.experience },
    cv?.interests && { icon: Heart, label: 'Minat', value: cv.interests },
  ].filter(Boolean) as { icon: typeof User; label: string; value: string }[]

  return (
    <Modal
      open
      onClose={onClose}
      title={`CV — ${cv?.full_name ?? app.alumni?.name ?? 'Pelamar'}`}
      description="Data CV yang dikirim pelamar"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={() => {
            navigate('/cv-preview', { state: { cvData: app.cv_data, coverLetter: app.cover_letter, alumniName: app.alumni?.name } })
          }}>
            <Eye className="size-4" /> Preview CV
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Profile Info */}
        {info.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Data Pribadi</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {info.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400">{label}</p>
                    <p className="text-sm text-slate-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {cv?.skills && cv.skills.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <Wrench className="size-3.5" /> Keahlian
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Cover Letter */}
        {app.cover_letter && (
          <div>
            <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase">Surat Lamaran</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{app.cover_letter}</p>
          </div>
        )}

        {/* Files */}
        {(app.cv_path || app.portfolio_path) && (
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <FileText className="size-3.5" /> File Lampiran
            </h4>
            <div className="mt-2 space-y-1.5">
              {app.cv_path && (
                <a
                  href={`/storage/${app.cv_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  <FileText className="size-4" /> CV — {app.cv_path.split('/').pop()}
                </a>
              )}
              {app.portfolio_path && (
                <a
                  href={`/storage/${app.portfolio_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  <FileText className="size-4" /> Portofolio — {app.portfolio_path.split('/').pop()}
                </a>
              )}
            </div>
          </div>
        )}

        {!cv && !app.cover_letter && !app.cv_path && !app.portfolio_path && (
          <p className="text-sm text-slate-400 italic">Tidak ada data CV yang dikirim.</p>
        )}
      </div>
    </Modal>
  )
}

export function JobApplicants() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()

  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [detailApp, setDetailApp] = useState<JobApplication | null>(null)

  const { data: job, isPending: jobPending, isError: jobError, refetch: refetchJob } = useJobVacancy(id)
  const { data, isPending, isError, refetch } = useJobApplicants(id ?? '', {
    status: statusFilter || undefined,
    page,
  })

  const [accepting, setAccepting] = useState<JobApplication | null>(null)
  const [form, setForm] = useState<AcceptanceForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const saveAcceptance = useSaveAcceptance(accepting?.id ?? '')

  const rows = data?.data ?? []

  const openAcceptance = (app: JobApplication) => {
    setAccepting(app)
    setForm(initialAcceptance(app))
    setFormError(null)
  }

  const submitAcceptance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setFormError(null)
    try {
      await saveAcceptance.mutateAsync({
        position_offered: form.position_offered.trim() || null,
        contract_type: form.contract_type || null,
        start_date: form.start_date || null,
        salary: form.salary.trim() || null,
        notes: form.notes.trim() || null,
      })
      toast('Data penerimaan lowongan berhasil disimpan')
      setAccepting(null)
    } catch (err) {
      setFormError(apiError(err))
    }
  }

  if (jobPending) return <LoadingState label="Memuat lowongan…" />
  if (jobError || !job) {
    return <ErrorState message="Gagal memuat detail lowongan" onRetry={() => refetchJob()} />
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pelamar Lowongan"
        subtitle={`${job.title} — ${job.company_name}`}
        actions={
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="size-4" /> Kembali ke lowongan
          </Link>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
        <Building2 className="size-4 shrink-0" />
        {job.institution_id ? (
          <span>Lowongan ini hanya tampil untuk alumni sekolah Anda.</span>
        ) : (
          <span>Lowongan lintas sekolah — tampil untuk alumni di seluruh sekolah.</span>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Select
            name="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="w-full sm:w-44"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data pelamar" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada pelamar"
            description="Pelamar yang mengirim lamaran akan tampil di sini."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Pelamar</Th>
                <Th>Jurusan</Th>
                <Th>Status Alumni</Th>
                <Th>Melamar</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((app) => (
                  <TRow key={app.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Briefcase className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{app.alumni?.name ?? 'Alumni'}</p>
                          <p className="text-xs text-slate-400">
                            {app.alumni?.graduation_year ? `Lulusan ${app.alumni.graduation_year}` : '—'}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{app.alumni?.department ?? '—'}</Td>
                    <Td className="text-slate-500">
                      {app.alumni?.employment_status
                        ? (EMPLOYMENT_LABELS[app.alumni.employment_status] ?? app.alumni.employment_status)
                        : '—'}
                    </Td>
                    <Td className="text-slate-500">{formatDate(app.applied_at)}</Td>
                    <Td>
                      <Badge tone={STATUS_TONES[app.status]}>{STATUS_LABELS[app.status]}</Badge>
                    </Td>
                    <Td>                        <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setDetailApp(app)}>
                          <FileText className="size-4" /> Detail CV
                        </Button>
                        <StatusSelect app={app} />
                        {app.status === 'accepted' && (
                          <Button variant="secondary" size="sm" onClick={() => openAcceptance(app)}>
                            <ClipboardCheck className="size-4" />
                            Hasil Penerimaan
                          </Button>
                        )}
                      </div>
                    </Td>
                  </TRow>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CvDataModal app={detailApp} onClose={() => setDetailApp(null)} />

      <Modal
        open={Boolean(accepting && form)}
        onClose={() => setAccepting(null)}
        title="Hasil Penerimaan Lowongan"
        description={accepting?.alumni?.name ? `Data penerimaan untuk ${accepting.alumni.name}` : 'Data penerimaan lowongan'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccepting(null)} disabled={saveAcceptance.isPending}>
              Batal
            </Button>
            <Button type="submit" form="acceptance-form" loading={saveAcceptance.isPending}>
              Simpan Data Penerimaan
            </Button>
          </>
        }
      >
        <form id="acceptance-form" onSubmit={submitAcceptance} className="space-y-4">
          {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{formError}</div>}
          {accepting?.acceptance && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Data penerimaan sudah tersimpan sebelumnya — simpan untuk memperbarui.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Posisi yang Ditawarkan">
              <Input
                name="position_offered"
                value={form?.position_offered ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, position_offered: e.target.value } : f))}
                placeholder="Contoh: Software Engineer"
              />
            </Field>
            <Field label="Jenis Kontrak">
              <Select
                name="contract_type"
                value={form?.contract_type ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, contract_type: e.target.value } : f))}
              >
                <option value="">— Pilih —</option>
                {Object.entries(CONTRACT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tanggal Mulai">
              <Input
                type="date"
                name="start_date"
                value={form?.start_date ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, start_date: e.target.value } : f))}
              />
            </Field>
            <Field label="Gaji / Upah" hint="Opsional">
              <Input
                name="salary"
                value={form?.salary ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, salary: e.target.value } : f))}
                placeholder="Contoh: Rp 5.000.000 - 7.000.000"
              />
            </Field>
          </div>
          <Field label="Catatan" hint="Opsional">
            <Textarea
              name="notes"
              rows={4}
              value={form?.notes ?? ''}
              onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))}
              placeholder="Keterangan tambahan, syarat, atau jadwal kerja…"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
