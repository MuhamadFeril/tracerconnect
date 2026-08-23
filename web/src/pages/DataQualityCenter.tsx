import { AlertTriangle, Info, Mail, Trash2, UserX, Users, XCircle } from 'lucide-react'
import { useDataQuality } from '../hooks/queries'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { Badge } from '../components/ui/Badge'

export function DataQualityCenter() {
  const { data, isPending, isError, refetch } = useDataQuality()

  if (isPending) return <LoadingState label="Memuat laporan kualitas data…" />
  if (isError || !data) {
    return <ErrorState message="Gagal memuat laporan kualitas data" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Data Quality Center</h1>
        <p className="mt-1 text-sm text-slate-500">Analisis kualitas data alumni institusi Anda</p>
      </div>

      {/* Health Score + Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthScoreCard score={data.health_score} status={data.health_status} />
        <StatCard
          label="Total Alumni"
          value={data.total_alumni.toLocaleString('id-ID')}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="Duplikat"
          value={data.duplicates.total_duplicates.toLocaleString('id-ID')}
          sub={`${data.duplicates.total_groups} grup`}
          icon={Trash2}
          tone="amber"
        />
        <StatCard
          label="Profil Tidak Lengkap"
          value={data.profile_issues.incomplete_profiles.toLocaleString('id-ID')}
          sub="3+ field kosong"
          icon={UserX}
          tone="amber"
        />
      </div>

      {/* Missing Fields */}
      <Card>
        <CardHeader title="Field Yang Kosong" subtitle="Jumlah alumni yang belum memiliki data ini" />
        <CardContent>
          {Object.values(data.missing_fields).every((v) => v === 0) ? (
            <EmptyState title="Semua field sudah terisi" description="Tidak ada data yang kosong." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(data.missing_fields)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([field, count]) => (
                  <MissingFieldCard key={field} field={field} count={count} total={data.total_alumni} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Issues */}
      <Card>
        <CardHeader title="Masalah Profil" subtitle="Alumni dengan masalah pada profil mereka" />
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <IssueCard
              icon={<Users className="size-5" />}
              label="Tanpa Akun"
              count={data.profile_issues.without_user_account}
              total={data.total_alumni}
              description="Belum memiliki akun portal"
              tone="amber"
            />
            <IssueCard
              icon={<Mail className="size-5" />}
              label="Tidak Terjangkau"
              count={data.profile_issues.unreachable}
              total={data.total_alumni}
              description="Tanpa akun DAN tanpa email"
          tone="amber"
            />
            <IssueCard
              icon={<UserX className="size-5" />}
              label="Profil Tidak Lengkap"
              count={data.profile_issues.incomplete_profiles}
              total={data.total_alumni}
              description="3+ field penting kosong"
              tone="orange"
            />
            <IssueCard
              icon={<AlertTriangle className="size-5" />}
              label="Profil Stale"
              count={data.profile_issues.stale_profiles}
              total={data.total_alumni}
              description="Belum diperbarui > 6 bulan"
              tone="sky"
            />
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {data.duplicates.groups.length > 0 && (
        <Card>
          <CardHeader
            title="Kemungkinan Duplikat"
            subtitle={`${data.duplicates.total_groups} grup duplikat ditemukan`}
          />
          <div className="divide-y divide-slate-100">
            {data.duplicates.groups.map((group, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{group.name}</p>
                  <p className="text-xs text-slate-400">
                    {group.count} record
                    {group.graduation_year_id ? ` · Tahun lulus: ${group.graduation_year_id}` : ''}
                  </p>
                </div>
                <Badge tone="amber">{group.count}x</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader title="Rekomendasi" subtitle="Langkah yang disarankan untuk meningkatkan kualitas data" />
          <div className="divide-y divide-slate-100">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-0.5">
                  {rec.priority === 'high' ? (
                    <XCircle className="size-5 text-red-500" />
                  ) : rec.priority === 'medium' ? (
                    <AlertTriangle className="size-5 text-amber-500" />
                  ) : (
                    <Info className="size-5 text-sky-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{rec.message}</p>
                </div>
                <Badge
                  tone={
                    rec.priority === 'high' ? 'rose' : rec.priority === 'medium' ? 'amber' : 'sky'
                  }
                >
                  {rec.priority === 'high' ? 'Tinggi' : rec.priority === 'medium' ? 'Sedang' : 'Rendah'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function HealthScoreCard({ score, status }: { score: number; status: string }) {
  const color =
    score >= 90
      ? 'text-emerald-600 bg-emerald-50 ring-emerald-200'
      : score >= 75
        ? 'text-indigo-600 bg-indigo-50 ring-indigo-200'
        : score >= 60
          ? 'text-amber-600 bg-amber-50 ring-amber-200'
          : score >= 40
            ? 'text-orange-600 bg-orange-50 ring-orange-200'
            : 'text-red-600 bg-red-50 ring-red-200'

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className={`flex size-20 items-center justify-center rounded-full ring-4 ${color}`}>
          <span className="text-2xl font-bold">{score}</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-800">{status}</p>
        <p className="text-xs text-slate-400">Skor Kualitas Data</p>
      </CardContent>
    </Card>
  )
}

function MissingFieldCard({ field, count, total }: { field: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const labels: Record<string, string> = {
    email: 'Email',
    phone: 'Telepon',
    graduation_year: 'Tahun Lulus',
    department: 'Jurusan',
    address: 'Alamat',
    employment_status: 'Status Kerja',
    gender: 'Jenis Kelamin',
    birth_date: 'Tanggal Lahir',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium text-slate-400">{labels[field] ?? field}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{count.toLocaleString('id-ID')}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{pct}% kosong</p>
    </div>
  )
}

function IssueCard({
  icon,
  label,
  count,
  total,
  description,
  tone,
}: {
  icon: React.ReactNode
  label: string
  count: number
  total: number
  description: string
  tone: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const toneColors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    rose: 'bg-rose-50 text-rose-600 ring-rose-200',
    orange: 'bg-orange-50 text-orange-600 ring-orange-200',
    sky: 'bg-sky-50 text-sky-600 ring-sky-200',
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ${toneColors[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <span className="text-sm font-bold text-slate-900">{count.toLocaleString('id-ID')}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full bg-${tone}-400`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{pct}% dari total</p>
      </div>
    </div>
  )
}
