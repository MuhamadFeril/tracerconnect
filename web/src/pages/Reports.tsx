import { useState } from 'react'
import {
  Briefcase,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  MessagesSquare,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react'
import { apiError, downloadFile } from '../lib/api'
import { useExecutiveSummary, useSurveys } from '../hooks/queries'
import { EMPLOYMENT_LABELS, formatDateTime } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Field'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

const dateStamp = () => new Date().toISOString().slice(0, 10)

export function Reports() {
  const { data: summary, isPending, isError, refetch } = useExecutiveSummary()
  const { data: surveysData } = useSurveys({ per_page: 100 })
  const toast = useToast()

  const [surveyId, setSurveyId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const download = async (key: string, url: string, filename: string) => {
    setBusy(key)
    try {
      await downloadFile(url, filename)
      toast('File berhasil diunduh')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        subtitle="Executive summary, laporan tracer study, dan export data alumni"
      />

      {isPending ? (
        <LoadingState label="Menyiapkan laporan…" />
      ) : isError || !summary ? (
        <ErrorState message="Gagal memuat data laporan" onRetry={() => refetch()} />
      ) : (
        <>
          {/* Executive summary */}
          <Card>
            <CardHeader
              title="Executive Summary"
              subtitle={`${summary.institution} — dibuat ${formatDateTime(summary.generated_at)}`}
              actions={
                <>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4" /> Cetak
                  </Button>
                  <Button
                    size="sm"
                    loading={busy === 'executive-summary-pdf'}
                    onClick={() => download('executive-summary-pdf', '/reports/executive-summary/pdf', `executive-summary-${dateStamp()}.pdf`)}
                  >
                    <FileText className="size-4" /> Unduh PDF
                  </Button>
                </>
              }
            />
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Alumni" value={summary.total_alumni.toLocaleString('id-ID')} icon={Users} tone="indigo" />
                <StatCard label="Responden" value={summary.total_respondents.toLocaleString('id-ID')} sub="Respons tersubmit" icon={ClipboardList} tone="sky" />
                <StatCard label="Response Rate" value={`${summary.response_rate}%`} sub="Alumni yang mengisi" icon={TrendingUp} tone="emerald" />
                <StatCard label="Total Survey" value={summary.total_surveys} sub={`${summary.total_responses} respons`} icon={MessagesSquare} tone="amber" />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Distribusi Status Kerja</h3>
                <p className="mt-0.5 text-xs text-slate-500">Status pekerjaan alumni saat ini</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  {summary.employment_distribution.length === 0 ? (
                    <EmptyState title="Belum ada data status kerja" />
                  ) : (
                    <Table>
                      <THead>
                        <Th>Status</Th>
                        <Th className="text-center">Jumlah</Th>
                        <Th className="text-right">Persentase</Th>
                      </THead>
                      <TBody>
                        {summary.employment_distribution.map((item) => (
                          <TRow key={item.status}>
                            <Td className="font-medium text-slate-900">
                              {EMPLOYMENT_LABELS[item.status] ?? item.status}
                            </Td>
                            <Td className="text-center">{item.count}</Td>
                            <Td className="text-right text-slate-600">
                              {summary.total_alumni > 0
                                ? `${Math.round((item.count / summary.total_alumni) * 100)}%`
                                : '0%'}
                            </Td>
                          </TRow>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Export tools */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader
                title="Export Alumni"
                subtitle="Semua data alumni sesuai hak akses"
                actions={<Users className="size-4.5 text-slate-400" />}
              />
              <div className="flex gap-2 px-5 py-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  loading={busy === 'alumni-csv'}
                  onClick={() => download('alumni-csv', '/reports/alumni/export/csv', `alumni-${dateStamp()}.csv`)}
                >
                  <FileSpreadsheet className="size-4" /> CSV
                </Button>
                <Button
                  className="flex-1"
                  loading={busy === 'alumni-xlsx'}
                  onClick={() => download('alumni-xlsx', '/reports/alumni/export/xlsx', `alumni-${dateStamp()}.xlsx`)}
                >
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Export Hasil Survey"
                subtitle="Rekapitulasi jawaban per pertanyaan"
                actions={<ClipboardList className="size-4.5 text-slate-400" />}
              />
              <div className="space-y-3 px-5 py-4">
                <Select value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
                  <option value="">— Pilih Survey —</option>
                  {surveysData?.data.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!surveyId}
                    loading={busy === 'survey-csv'}
                    onClick={() => download('survey-csv', `/reports/surveys/${surveyId}/results/export/csv`, `hasil-survey-${dateStamp()}.csv`)}
                  >
                    <FileSpreadsheet className="size-4" /> CSV
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!surveyId}
                    loading={busy === 'survey-xlsx'}
                    onClick={() => download('survey-xlsx', `/reports/surveys/${surveyId}/results/export/xlsx`, `hasil-survey-${dateStamp()}.xlsx`)}
                  >
                    <FileSpreadsheet className="size-4" /> Excel
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Laporan Tracer Study"
                subtitle="Statistik pekerjaan lulusan: per tahun & per jurusan"
                actions={<Briefcase className="size-4.5 text-slate-400" />}
              />
              <div className="px-5 py-4">
                <Button
                  className="w-full"
                  loading={busy === 'tracer-pdf'}
                  onClick={() => download('tracer-pdf', '/reports/tracer/pdf', `tracer-report-${dateStamp()}.pdf`)}
                >
                  <GraduationCap className="size-4" /> Unduh PDF
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Laporan PDF berisi ringkasan status pekerjaan, breakdown per tahun lulus, dan per jurusan.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
