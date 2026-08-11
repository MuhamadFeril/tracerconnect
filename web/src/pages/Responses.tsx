import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { useDeleteResponse, useResponses, useSurveys } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import { formatDateTime } from '../lib/format'
import type { SurveyResponseItem } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function CompletionBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-slate-300">—</span>

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-800"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500">{value}%</span>
    </div>
  )
}

export function Responses() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [surveyId, setSurveyId] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useResponses({
    search: debouncedSearch || undefined,
    status: status || undefined,
    survey_id: surveyId || undefined,
    page,
  })
  const { data: surveys } = useSurveys({ page: 1, per_page: 100 })
  const deleteResponse = useDeleteResponse()
  const toast = useToast()

  const [deleting, setDeleting] = useState<SurveyResponseItem | null>(null)

  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Respons Tracer Study"
        subtitle="Pantau pengisian survey oleh alumni dan tinjau jawaban"
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari responden…"
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-44">
            <option value="">Semua Status</option>
            <option value="in_progress">Draft</option>
            <option value="submitted">Selesai</option>
            <option value="expired">Kedaluwarsa</option>
          </Select>
          <Select value={surveyId} onChange={(e) => { setSurveyId(e.target.value); setPage(1) }} className="w-full sm:w-64">
            <option value="">Semua Survey</option>
            {surveys?.data.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat respons" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada respons"
            description="Respons akan muncul di sini ketika alumni mulai atau menyelesaikan survey."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Responden</Th>
                <Th>Survey</Th>
                <Th>Status</Th>
                <Th>Kelengkapan</Th>
                <Th>Dikirim</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TRow key={r.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          {(r.respondent?.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{r.respondent?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{r.respondent?.email ?? ''}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="max-w-52">
                      <p className="truncate text-slate-700">{r.survey?.title ?? '—'}</p>
                      <p className="text-xs text-slate-400">v{r.version}</p>
                    </Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td><CompletionBar value={r.completion} /></Td>
                    <Td className="text-xs text-slate-500">{formatDateTime(r.submitted_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/responses/${r.id}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Tinjau"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <button
                          onClick={() => setDeleting(r)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="size-4" />
                        </button>
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

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteResponse.mutateAsync(deleting.id)
            toast('Respons berhasil dihapus. Alumni dapat mengisi ulang.')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={deleteResponse.isPending}
        title="Hapus Respons"
        message={
          <>
            Respons dari <span className="font-semibold text-slate-800">{deleting?.respondent?.name}</span> untuk
            survey <span className="font-semibold text-slate-800">{deleting?.survey?.title}</span> akan dihapus.
            Alumni dapat mengisi ulang jika diperlukan.
          </>
        }
      />
    </div>
  )
}
