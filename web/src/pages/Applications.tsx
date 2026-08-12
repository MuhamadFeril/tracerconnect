import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Briefcase, Search, Users } from 'lucide-react'
import { apiError } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'
import {
  useJobApplications,
  useJobVacancies,
  useUpdateApplicationStatus,
} from '../hooks/queries'
import type { JobApplicationStatus } from '../lib/types'
import { APPLICATION_STATUS_LABELS, formatDate } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { Badge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

const STATUS_OPTIONS: { value: JobApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: APPLICATION_STATUS_LABELS.pending },
  { value: 'reviewed', label: APPLICATION_STATUS_LABELS.reviewed },
  { value: 'accepted', label: APPLICATION_STATUS_LABELS.accepted },
  { value: 'rejected', label: APPLICATION_STATUS_LABELS.rejected },
  { value: 'cancelled', label: APPLICATION_STATUS_LABELS.cancelled },
]

const STATUS_TONES: Record<JobApplicationStatus, 'amber' | 'sky' | 'green' | 'rose' | 'slate'> = {
  pending: 'amber',
  reviewed: 'sky',
  accepted: 'green',
  rejected: 'rose',
  cancelled: 'slate',
}

export function Applications() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [jobId, setJobId] = useState(searchParams.get('job_vacancy_id') ?? '')
  const [page, setPage] = useState(1)

  // Keep the URL filter in sync when arriving from the Jobs table.
  useEffect(() => {
    const param = searchParams.get('job_vacancy_id')
    if (param && param !== jobId) {
      setJobId(param)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const { data, isPending, isError, refetch } = useJobApplications({
    search: debouncedSearch || undefined,
    status: status || undefined,
    job_vacancy_id: jobId || undefined,
    page,
  })
  const vacancies = useJobVacancies({ per_page: 100 })
  const updateStatus = useUpdateApplicationStatus()

  const rows = useMemo(() => data?.data ?? [], [data])
  const updatingId = updateStatus.isPending ? updateStatus.variables?.id : null

  const setFilter = (key: 'status' | 'job_vacancy_id', value: string) => {
    if (key === 'job_vacancy_id') {
      const next = new URLSearchParams(searchParams)
      if (value) next.set('job_vacancy_id', value)
      else next.delete('job_vacancy_id')
      setSearchParams(next, { replace: true })
      setJobId(value)
    } else {
      setStatus(value)
    }
    setPage(1)
  }

  const onChangeStatus = async (id: string, value: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: value })
      toast(`Status lamaran diubah menjadi ${APPLICATION_STATUS_LABELS[value] ?? value}`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lamaran Masuk"
        subtitle="Tinjau lamaran alumni dan perbarui statusnya"
        actions={
          <Button variant="secondary" onClick={() => refetch()}>
            <Users className="size-4" /> Segarkan
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama atau email pelamar…"
              className="pl-9"
            />
          </div>
          <Select name="job-filter" value={jobId} onChange={(e) => setFilter('job_vacancy_id', e.target.value)} className="w-full sm:w-64">
            <option value="">Semua Lowongan</option>
            {(vacancies.data?.data ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} — {job.company_name}
              </option>
            ))}
          </Select>
          <Select name="status-filter" value={status} onChange={(e) => setFilter('status', e.target.value)} className="w-full sm:w-48">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            description="Lamaran alumni yang masuk akan muncul di sini."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Pelamar</Th>
                <Th>Lowongan</Th>
                <Th>Pesan</Th>
                <Th>Dilamar</Th>
                <Th>Status</Th>
              </THead>
              <TBody>
                {rows.map((application) => {
                  const name = application.applicant?.name ?? '—'
                  const initials = name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p.charAt(0).toUpperCase())
                    .join('')
                  const busy = updatingId === application.id
                  return (
                    <TRow key={application.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 text-xs font-bold text-white">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{name}</p>
                            <p className="truncate text-xs text-slate-400">{application.applicant?.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="min-w-0 max-w-xs">
                          <p className="flex items-center gap-1.5 truncate font-medium text-slate-800">
                            <Briefcase className="size-3.5 shrink-0 text-indigo-400" />
                            {application.job?.title ?? 'Lowongan'}
                          </p>
                          <p className="truncate text-xs text-slate-400">{application.job?.company_name}</p>
                        </div>
                      </Td>
                      <Td>
                        {application.message ? (
                          <p className="line-clamp-2 max-w-xs text-xs leading-relaxed text-slate-500">{application.message}</p>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </Td>
                      <Td className="text-slate-500">{formatDate(application.created_at)}</Td>
                      <Td>
                        {application.status === 'cancelled' ? (
                          <Badge tone="slate">{APPLICATION_STATUS_LABELS.cancelled}</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge tone={STATUS_TONES[application.status]}>
                              {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                            </Badge>
                            <Select
                              name={`status-${application.id}`}
                              value={application.status}
                              disabled={busy}
                              onChange={(e) => onChangeStatus(application.id, e.target.value)}
                              className="w-36 py-1 text-xs"
                              aria-label="Ubah status lamaran"
                            >
                              <option value="pending">{APPLICATION_STATUS_LABELS.pending}</option>
                              <option value="reviewed">{APPLICATION_STATUS_LABELS.reviewed}</option>
                              <option value="accepted">{APPLICATION_STATUS_LABELS.accepted}</option>
                              <option value="rejected">{APPLICATION_STATUS_LABELS.rejected}</option>
                            </Select>
                            {busy && (
                              <span className="size-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                            )}
                          </div>
                        )}
                      </Td>
                    </TRow>
                  )
                })}
              </TBody>
            </Table>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
