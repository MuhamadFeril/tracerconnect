import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ClipboardCheck, Eye, Inbox, Search } from 'lucide-react'
import { useHrdApplications, useJobVacancies, useSaveAcceptance, useUpdateApplicationStatus } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { CvFormData, JobApplication, JobApplicationStatus } from '../lib/types'
import { apiError } from '../lib/api'
import { EMPLOYMENT_LABELS, formatDate, initials } from '../lib/format'
import { CvDataContent } from '../components/CvDataModal'
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
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TONES } from './hrd/HrdDashboard'

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
      {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  )
}

export function HrdApplications() {
  const toast = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [vacancyFilter, setVacancyFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useHrdApplications({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    job_vacancy_id: vacancyFilter || undefined,
    page,
  })

  // HRD-scoped vacancies power the per-lowongan filter.
  const { data: myJobs } = useJobVacancies({ per_page: 100 })

  const [detail, setDetail] = useState<JobApplication | null>(null)
  const [accepting, setAccepting] = useState<JobApplication | null>(null)
  const [form, setForm] = useState<AcceptanceForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const saveAcceptance = useSaveAcceptance(accepting?.id ?? '')

  const rows = useMemo(() => data?.data ?? [], [data])

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kelola Lamaran"
        subtitle="Semua pelamar dari seluruh lowongan Anda dalam satu tempat"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            <Inbox className="size-3.5 text-indigo-500" />
            {data?.meta?.total?.toLocaleString('id-ID') ?? 0} pelamar
          </span>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama pelamar / posisi…"
              className="pl-9"
            />
          </div>
          <Select
            name="vacancy-filter"
            value={vacancyFilter}
            onChange={(e) => {
              setVacancyFilter(e.target.value)
              setPage(1)
            }}
            className="w-full sm:w-56"
          >
            <option value="">Semua Lowongan</option>
            {(myJobs?.data ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} — {job.company_name}
              </option>
            ))}
          </Select>
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
            {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data lamaran" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada lamaran"
            description="Lamaran yang masuk dari semua lowongan Anda akan tampil di sini."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Pelamar</Th>
                <Th>Lowongan</Th>
                <Th>Jurusan</Th>
                <Th>Melamar</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((app) => (
                  <TRow key={app.id}>
                    <Td>
                      <button onClick={() => setDetail(app)} className="flex items-center gap-3 text-left">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 text-[11px] font-bold text-white">
                          {initials(app.alumni?.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[12rem] truncate font-medium text-slate-900 hover:text-indigo-600">
                            {app.alumni?.name ?? 'Alumni'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {app.alumni?.graduation_year ? `Lulusan ${app.alumni.graduation_year}` : '—'}
                          </p>
                        </div>
                      </button>
                    </Td>
                    <Td>
                      <div className="min-w-0">
                        <p className="max-w-[14rem] truncate text-slate-700">{app.vacancy?.title ?? '—'}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          <Building2 className="size-3" /> {app.vacancy?.company_name ?? '—'}
                        </p>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{app.alumni?.department ?? '—'}</Td>
                    <Td className="text-slate-500">{formatDate(app.applied_at)}</Td>
                    <Td>
                      <Badge tone={APPLICATION_STATUS_TONES[app.status]}>{APPLICATION_STATUS_LABELS[app.status]}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setDetail(app)}>
                          Detail
                        </Button>
                        <StatusSelect app={app} />
                        {app.status === 'accepted' && (
                          <Button variant="secondary" size="sm" onClick={() => openAcceptance(app)}>
                            <ClipboardCheck className="size-4" />
                            Hasil
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

      {/* Applicant detail */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detail Lamaran"
        description={detail?.alumni?.name ? `Pelamar: ${detail.alumni.name}` : undefined}
        size="lg"
        footer={
          <>
            {detail?.alumni && (
              <Button
                variant="secondary"
                onClick={() => {
                  const a = detail.alumni
                  const cvFromProfile: CvFormData = detail.cv_data ?? {
                    full_name: a?.name ?? '',
                    email: null,
                    phone: null,
                    gender: null,
                    birth_date: null,
                    birthplace: null,
                    address: null,
                    department: a?.department ?? null,
                    graduation_year: a?.graduation_year != null ? String(a.graduation_year) : null,
                    education: [a?.department, a?.graduation_year ? `'${String(a.graduation_year).slice(2)}` : ''].filter(Boolean).join(' · '),
                    skills: null,
                    experience: [a?.position, a?.company_name].filter(Boolean).join(' di ') || null,
                    interests: null,
                  }
                  navigate('/cv-preview', {
                    state: { cvData: cvFromProfile, coverLetter: detail.cover_letter, alumniName: a?.name },
                  })
                }}
              >
                <Eye className="size-4" /> Preview CV
              </Button>
            )}
            {detail && detail.status !== 'withdrawn' && (
              <StatusSelect app={{ ...detail }} />
            )}
            {detail?.status === 'accepted' && (
              <Button
                onClick={() => {
                  const target = detail
                  setDetail(null)
                  openAcceptance(target)
                }}
              >
                <ClipboardCheck className="size-4" /> Hasil Penerimaan
              </Button>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Posisi dilamar</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{detail.vacancy?.title ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Perusahaan</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{detail.vacancy?.company_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Jurusan</p>
                <p className="mt-0.5 text-sm text-slate-800">{detail.alumni?.department ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tahun lulus</p>
                <p className="mt-0.5 text-sm text-slate-800">{detail.alumni?.graduation_year ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status alumni</p>
                <p className="mt-0.5 text-sm text-slate-800">
                  {detail.alumni?.employment_status
                    ? (EMPLOYMENT_LABELS[detail.alumni.employment_status] ?? detail.alumni.employment_status)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tanggal melamar</p>
                <p className="mt-0.5 text-sm text-slate-800">{formatDate(detail.applied_at)}</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Data CV</p>
              <CvDataContent app={detail} />
            </div>

            {detail.acceptance && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Hasil Penerimaan</p>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-slate-500">Posisi:</span> <span className="font-medium">{detail.acceptance.position_offered ?? '—'}</span></p>
                  <p><span className="text-slate-500">Kontrak:</span> <span className="font-medium">{detail.acceptance.contract_type ? (CONTRACT_LABELS[detail.acceptance.contract_type] ?? detail.acceptance.contract_type) : '—'}</span></p>
                  <p><span className="text-slate-500">Mulai:</span> <span className="font-medium">{formatDate(detail.acceptance.start_date)}</span></p>
                  <p><span className="text-slate-500">Gaji:</span> <span className="font-medium">{detail.acceptance.salary ?? '—'}</span></p>
                  {detail.acceptance.notes && <p className="sm:col-span-2"><span className="text-slate-500">Catatan:</span> {detail.acceptance.notes}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Acceptance result form */}
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
