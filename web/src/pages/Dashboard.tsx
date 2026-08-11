import { Link } from 'react-router-dom'
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
import { Briefcase, ChevronRight, ClipboardList, TrendingUp, Users } from 'lucide-react'
import { useAnalytics } from '../hooks/queries'
import { EMPLOYMENT_LABELS, formatDateTime } from '../lib/format'
import { Card, CardHeader } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { Badge } from '../components/ui/Badge'

const PIE_COLORS = ['#1e3a8a', '#10b981', '#0ea5e9', '#f59e0b', '#94a3b8']
const BAR_COLORS = ['#1e3a8a', '#8ca6dc']

export function Dashboard() {
  const { data, isPending, isError, refetch } = useAnalytics()

  if (isPending) return <LoadingState label="Memuat dashboard…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat data dashboard" onRetry={() => refetch()} />
  }

  const employmentData = data.employment_distribution.map((item) => ({
    name: EMPLOYMENT_LABELS[item.status] ?? item.status,
    value: item.count,
  }))

  const working = data.employment_distribution.find((d) => d.status === 'working')?.count ?? 0
  const workingRate = data.total_alumni > 0 ? Math.round((working / data.total_alumni) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan tracer study dan alumni institusi Anda</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Alumni" value={data.total_alumni.toLocaleString('id-ID')} icon={Users} tone="indigo" />
        <StatCard label="Responden" value={data.total_respondents.toLocaleString('id-ID')} sub="Respons tersubmit" icon={ClipboardList} tone="sky" />
        <StatCard label="Response Rate" value={`${data.response_rate}%`} sub="Alumni yang mengisi" icon={TrendingUp} tone="emerald" />
        <StatCard label="Bekerja" value={`${workingRate}%`} sub={`${working} alumni bekerja`} icon={Briefcase} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribusi Status Kerja" subtitle="Status pekerjaan alumni saat ini" />
          <div className="px-5 py-4">
            {employmentData.length === 0 ? (
              <EmptyState title="Belum ada data status kerja" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={employmentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {employmentData.map((entry, index) => (
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
          <CardHeader title="Alumni per Tahun Lulus" subtitle="Jumlah alumni berdasarkan angkatan" />
          <div className="px-5 py-4">
            {data.alumni_per_year.length === 0 ? (
              <EmptyState title="Belum ada data tahun lulus" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.alumni_per_year}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="Alumni" fill={BAR_COLORS[0]} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Respons per Survey" subtitle="Jumlah respons selesai setiap survey" />
          <div className="px-5 py-4">
            {data.responses_per_survey.length === 0 ? (
              <EmptyState title="Belum ada respons survey" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.responses_per_survey} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="Respons" fill={BAR_COLORS[1]} radius={[0, 6, 6, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Respons Terbaru"
            subtitle="5 respons terakhir yang dikirim alumni"
            actions={
              <Link to="/responses" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                Lihat semua <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {data.recent_responses.length === 0 ? (
              <EmptyState title="Belum ada respons" />
            ) : (
              data.recent_responses.map((r) => (
                <Link
                  key={r.id}
                  to={`/responses/${r.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                      {r.respondent.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{r.respondent}</p>
                      <p className="truncate text-xs text-slate-400">{r.survey}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="green">Selesai</Badge>
                    <span className="hidden text-xs text-slate-400 sm:block">{formatDateTime(r.submitted_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
