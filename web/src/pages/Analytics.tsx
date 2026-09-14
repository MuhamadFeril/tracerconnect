import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Briefcase, GraduationCap, Rocket, TrendingUp } from 'lucide-react'
import {
  useAnalytics,
  useDepartments,
  useEmployment,
  useGraduationYears,
  useSurveyResults,
  useSurveys,
} from '../hooks/queries'
import { EMPLOYMENT_LABELS, QUESTION_TYPE_LABELS } from '../lib/format'
import type { EmploymentStatusKey } from '../lib/types'
import { Card, CardHeader } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Select } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'

const STATUS_KEYS: EmploymentStatusKey[] = ['working', 'unemployed', 'entrepreneur', 'continuing_study', 'unknown']

const STATUS_COLORS: Record<string, string> = {
  working: '#10b981',
  unemployed: '#f59e0b',
  entrepreneur: '#0ea5e9',
  continuing_study: '#8b5cf6',
  unknown: '#94a3b8',
}

const PIE_COLORS = ['#1e3a8a', '#10b981', '#0ea5e9', '#f59e0b', '#94a3b8']

function statusLabel(status: string): string {
  return EMPLOYMENT_LABELS[status] ?? (status === 'unknown' ? 'Tidak Diketahui' : status)
}

function FilterBar({
  graduationYearId,
  departmentId,
  onGraduationYear,
  onDepartment,
}: {
  graduationYearId: string
  departmentId: string
  onGraduationYear: (value: string) => void
  onDepartment: (value: string) => void
}) {
  const { data: years } = useGraduationYears()
  const { data: departments } = useDepartments()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Tahun Lulus</p>
        <Select value={graduationYearId} onChange={(e) => onGraduationYear(e.target.value)} className="w-full sm:w-44">
          <option value="">Semua Angkatan</option>
          {years?.data.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </Select>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Jurusan</p>
        <Select value={departmentId} onChange={(e) => onDepartment(e.target.value)} className="w-full sm:w-52">
          <option value="">Semua Jurusan</option>
          {departments?.data.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export function Analytics() {
  const [graduationYearId, setGraduationYearId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [surveyId, setSurveyId] = useState('')

  const filters = useMemo(
    () => ({
      graduation_year_id: graduationYearId || undefined,
      department_id: departmentId || undefined,
    }),
    [graduationYearId, departmentId],
  )

  const overview = useAnalytics(filters)
  const employment = useEmployment(filters)
  const { data: surveys } = useSurveys({ page: 1, per_page: 100 })

  const effectiveSurveyId = surveyId || surveys?.data[0]?.id || ''
  const surveyResults = useSurveyResults(effectiveSurveyId)

  const pieData = useMemo(
    () =>
      (overview.data?.employment_distribution ?? []).map((item) => ({
        name: statusLabel(item.status),
        value: item.count,
      })),
    [overview.data],
  )

  const stackedData = useMemo(() => employment.data?.by_year ?? [], [employment.data])
  const departmentStackedData = useMemo(() => employment.data?.by_department ?? [], [employment.data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            KPI tracer study dengan filter tahun lulus dan jurusan
          </p>
        </div>
        <FilterBar
          graduationYearId={graduationYearId}
          departmentId={departmentId}
          onGraduationYear={setGraduationYearId}
          onDepartment={setDepartmentId}
        />
      </div>

      {overview.isPending ? (
        <LoadingState label="Memuat analitik…" />
      ) : overview.isError ? (
        <ErrorState message="Gagal memuat data analitik" onRetry={() => overview.refetch()} />
      ) : overview.data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Response Rate" value={`${overview.data.response_rate}%`} sub={`${overview.data.total_respondents} dari ${overview.data.total_alumni} alumni`} icon={TrendingUp} tone="indigo" />
            <StatCard label="Employment Rate" value={`${overview.data.employment_rate}%`} sub="Alumni yang bekerja" icon={Briefcase} tone="emerald" />
            <StatCard label="Wirausaha" value={`${overview.data.entrepreneurship_rate}%`} sub="Alumni berwirausaha" icon={Rocket} tone="sky" />
            <StatCard label="Melanjutkan Studi" value={`${overview.data.continuing_study_rate}%`} sub="Alumni kuliah lanjut" icon={GraduationCap} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Distribusi Status Kerja" subtitle="Komposisi alumni berdasarkan status pekerjaan" />
              <div className="px-5 py-4">
                {pieData.length === 0 ? (
                  <EmptyState title="Belum ada data status kerja" />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Perbandingan Antar Angkatan" subtitle="Status pekerjaan per tahun lulus (stacked)" />
              <div className="px-5 py-4">
                {stackedData.length === 0 ? (
                  <EmptyState title="Belum ada data angkatan" />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Legend />
                        {STATUS_KEYS.map((key) => (
                          <Bar key={key} dataKey={key} name={statusLabel(key)} stackId="a" fill={STATUS_COLORS[key]} maxBarSize={44} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Status per Jurusan" subtitle="Perbandingan status kerja lintas jurusan" />
              <div className="px-5 py-4">
                {departmentStackedData.length === 0 ? (
                  <EmptyState title="Belum ada data jurusan" />
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentStackedData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="department" width={130} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Legend />
                        {STATUS_KEYS.map((key) => (
                          <Bar key={key} dataKey={key} name={statusLabel(key)} stackId="a" fill={STATUS_COLORS[key]} maxBarSize={18} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Respons per Survey" subtitle="Jumlah respons selesai tiap survey" />
              <div className="px-5 py-4">
                {overview.data.responses_per_survey.length === 0 ? (
                  <EmptyState title="Belum ada respons survey" />
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.data.responses_per_survey} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="count" name="Respons" fill="#8ca6dc" radius={[0, 6, 6, 0]} maxBarSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader
          title="Analisis Jawaban Survey"
          subtitle="Rekapitulasi jawaban dari respons yang sudah selesai"
          actions={
            <Select value={effectiveSurveyId} onChange={(e) => setSurveyId(e.target.value)} className="w-full sm:w-64">
              {surveys?.data.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
          }
        />

        {surveyResults.isPending && effectiveSurveyId ? (
          <LoadingState label="Memuat hasil survey…" />
        ) : surveyResults.isError ? (
          <ErrorState message="Gagal memuat hasil survey" onRetry={() => surveyResults.refetch()} />
        ) : surveyResults.data ? (
          <>
            <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
              {surveyResults.data.total_responses} respons selesai · {surveyResults.data.question_stats.length} pertanyaan
            </div>
            {surveyResults.data.question_stats.length === 0 ? (
              <EmptyState title="Belum ada pertanyaan" />
            ) : (
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                {surveyResults.data.question_stats.map((stat) => (
                  <div key={stat.question_id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-medium text-slate-800">{stat.label}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="indigo">{QUESTION_TYPE_LABELS[stat.type] ?? stat.type}</Badge>
                      <Badge tone="slate">{stat.response_count} jawaban</Badge>
                      {stat.average !== null && stat.average !== undefined && (
                        <Badge tone="violet">rata-rata {stat.average}</Badge>
                      )}
                    </div>
                    {stat.option_counts.length > 0 && (
                      <div className="mt-3 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stat.option_counts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="count" name="Jawaban" fill="#1e3a8a" radius={[0, 5, 5, 0]} maxBarSize={14} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState title="Pilih survey untuk melihat rekapitulasi jawaban" />
        )}
      </Card>
    </div>
  )
}
