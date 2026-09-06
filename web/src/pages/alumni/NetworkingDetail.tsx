import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Building2,
  Flag,
  GraduationCap,
  MapPin,
  MessageCircle,
  ShieldAlert,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react'
import { apiError } from '../../lib/api'
import {
  useBlockUser,
  useNetworkingAlumnus,
  useRemoveConnection,
  useReportUser,
  useSendConnectionRequest,
  useStartConversation,
} from '../../hooks/queries'
import { avatarUrl, employmentLabel, initials } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'
import clsx from 'clsx'

const REPORT_REASONS = [
  'spam',
  'fake_profile',
  'inappropriate',
  'harassment',
  'scam',
  'other',
]

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam atau iklan',
  fake_profile: 'Profil palsu',
  inappropriate: 'Konten tidak pantas',
  harassment: 'Pelecehan',
  scam: 'Penipuan',
  other: 'Lainnya',
}

export function NetworkingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: alumni, isPending, isError, refetch } = useNetworkingAlumnus(id ?? '')

  const send = useSendConnectionRequest()
  const remove = useRemoveConnection()
  const block = useBlockUser()
  const report = useReportUser()
  const startChat = useStartConversation()

  const onChat = async () => {
    if (!alumni?.user_id) return
    try {
      const conversation = await startChat.mutateAsync({ user_id: alumni.user_id })
      navigate(`/chat/${conversation.id}`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const [confirmingBlock, setConfirmingBlock] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const connectionStatus = alumni?.connection.status ?? 'none'

  const onConnect = async () => {
    if (!alumni) return
    try {
      await send.mutateAsync(alumni.user_id)
      toast('Permintaan koneksi terkirim')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const onRemove = async () => {
    if (!alumni?.connection.connection_id) return
    try {
      await remove.mutateAsync(alumni.connection.connection_id)
      toast('Koneksi dihapus')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const onBlock = async () => {
    if (!alumni) return
    try {
      await block.mutateAsync(alumni.user_id)
      toast('Pengguna diblokir')
      setConfirmingBlock(false)
      navigate('/jejaring')
    } catch (err) {
      toast(apiError(err), 'error')
      setConfirmingBlock(false)
    }
  }

  const onSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alumni) return
    setFormError(null)
    try {
      await report.mutateAsync({
        reported_id: alumni.user_id,
        reason: reportReason,
        details: reportDetails || undefined,
      })
      toast('Laporan berhasil dikirim. Terima kasih atas perhatian Anda.')
      setReportOpen(false)
      setReportReason('')
      setReportDetails('')
    } catch (err) {
      setFormError(apiError(err))
    }
  }

  if (isPending) return <LoadingState label="Memuat profil alumni…" />
  if (isError || !alumni) {
    return (
      <div className="space-y-5">
        <Link to="/jejaring" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="size-4" /> Kembali ke Jejaring
        </Link>
        <ErrorState message="Profil alumni tidak ditemukan" onRetry={() => refetch()} />
      </div>
    )
  }

  const avatarSrc = avatarUrl(alumni.avatar_url)

  return (
    <div className="space-y-5">
      <Link to="/jejaring" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="size-4" /> Kembali ke Jejaring
      </Link>

      <PageHeader title="Profil Alumni" />

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white shadow-lg ring-4 ring-white">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-xl">{initials(alumni.name)}</span>
                )}
              </div>
              <div className="pb-1">
                <h2 className="text-lg font-bold text-slate-900">{alumni.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[alumni.department, alumni.graduation_year ? `Angkatan ${alumni.graduation_year}` : null].filter(Boolean).join(' · ') || 'Alumni'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-1">
              {connectionStatus === 'none' && (
                <Button onClick={onConnect} loading={send.isPending}>
                  <UserPlus className="size-4" /> Hubungkan
                </Button>
              )}
              {connectionStatus === 'pending_outgoing' && (
                <Badge tone="amber" className="px-3 py-1.5">
                  <UserPlus className="size-3.5" /> Permintaan terkirim
                </Badge>
              )}
              {connectionStatus === 'pending_incoming' && (
                <Badge tone="sky" className="px-3 py-1.5">
                  Menunggu tanggapan Anda
                </Badge>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <Badge tone="green" className="px-3 py-1.5">
                    <UserCheck className="size-3.5" /> Terhubung
                  </Badge>
                  <Button variant="secondary" size="sm" onClick={onChat} loading={startChat.isPending}>
                    <MessageCircle className="size-3.5" /> Pesan
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onRemove} loading={remove.isPending}>
                    <UserX className="size-3.5" /> Lepas Koneksi
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" onClick={() => setReportOpen(true)}>
                <Flag className="size-3.5" /> Laporkan
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingBlock(true)} className="text-slate-400 hover:text-rose-600">
                <Ban className="size-3.5" /> Blokir
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Status Ketenagakerjaan</h3>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Briefcase className="size-4 shrink-0 text-indigo-500" />
              <span>{employmentLabel(alumni.employment_status)}</span>
            </div>
            {alumni.employment_status === 'working' && (
              <>
                {alumni.position && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <GraduationCap className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.position}</span>
                  </div>
                )}
                {alumni.company_name && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Building2 className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.company_name}</span>
                  </div>
                )}
                {alumni.business_field && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Briefcase className="size-4 shrink-0 text-indigo-500" />
                    <span>Bidang: {alumni.business_field}</span>
                  </div>
                )}
                {alumni.work_city && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <MapPin className="size-4 shrink-0 text-indigo-500" />
                    <span>{[alumni.work_city, alumni.work_province].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </>
            )}
            {alumni.employment_status === 'continuing_study' && (
              <>
                {alumni.study_institution && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <GraduationCap className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.study_institution}</span>
                  </div>
                )}
                {alumni.study_program && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Building2 className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.study_program}</span>
                  </div>
                )}
                {alumni.study_entry_year && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Briefcase className="size-4 shrink-0 text-indigo-500" />
                    <span>Masuk kuliah {alumni.study_entry_year}</span>
                  </div>
                )}
              </>
            )}
            {alumni.employment_status === 'entrepreneur' && (
              <>
                {alumni.business_name && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Building2 className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.business_name}</span>
                  </div>
                )}
                {alumni.business_field && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Briefcase className="size-4 shrink-0 text-indigo-500" />
                    <span>Bidang: {alumni.business_field}</span>
                  </div>
                )}
                {alumni.business_start_year && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <GraduationCap className="size-4 shrink-0 text-indigo-500" />
                    <span>Sejak {alumni.business_start_year}</span>
                  </div>
                )}
                {alumni.business_city && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <MapPin className="size-4 shrink-0 text-indigo-500" />
                    <span>{[alumni.business_city, alumni.business_province].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {alumni.business_address && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <MapPin className="size-4 shrink-0 text-indigo-500" />
                    <span>{alumni.business_address}</span>
                  </div>
                )}
              </>
            )}
            {alumni.employment_status === 'unemployed' && alumni.location && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <MapPin className="size-4 shrink-0 text-indigo-500" />
                <span>{alumni.location}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Tentang</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Info label="Nama Lengkap" value={alumni.name} />
            <Info label="Jurusan" value={alumni.department} />
            <Info label="Angkatan" value={alumni.graduation_year ? String(alumni.graduation_year) : null} />
            <Info label="Status" value={employmentLabel(alumni.employment_status)} />
            {alumni.employment_status === 'working' && (
              <>
                <Info label="Perusahaan" value={alumni.company_name} />
                <Info label="Jabatan" value={alumni.position} />
                <Info label="Bidang Usaha" value={alumni.business_field} />
                <Info label="Provinsi Kerja" value={alumni.work_province} />
                <Info label="Kota Kerja" value={alumni.work_city} />
                <Info label="Lokasi" value={alumni.location} />
              </>
            )}
            {alumni.employment_status === 'continuing_study' && (
              <>
                <Info label="Universitas" value={alumni.study_institution} />
                <Info label="Jurusan / Prodi" value={alumni.study_program} />
                <Info label="Tahun Masuk" value={alumni.study_entry_year ? String(alumni.study_entry_year) : null} />
              </>
            )}
            {alumni.employment_status === 'entrepreneur' && (
              <>
                <Info label="Nama Usaha" value={alumni.business_name} />
                <Info label="Bidang Usaha" value={alumni.business_field} />
                <Info label="Tahun Mulai" value={alumni.business_start_year ? String(alumni.business_start_year) : null} />
                <Info label="Provinsi Usaha" value={alumni.business_province} />
                <Info label="Kota Usaha" value={alumni.business_city} />
                <Info label="Alamat Usaha" value={alumni.business_address} />
              </>
            )}
            {alumni.employment_status !== 'working' && alumni.employment_status !== 'continuing_study' && alumni.employment_status !== 'entrepreneur' && (
              <Info label="Lokasi" value={alumni.location} />
            )}
          </div>
          <p className="mt-5 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <ShieldAlert className="size-4 shrink-0 text-slate-400" />
            Jejaring hanya untuk keperluan membangun koneksi antar alumni. Data pribadi tidak dibagikan tanpa izin.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmingBlock}
        onClose={() => setConfirmingBlock(false)}
        onConfirm={onBlock}
        loading={block.isPending}
        title="Blokir Alumni"
        confirmLabel="Blokir"
        message={
          <>
            Blokir <span className="font-semibold text-slate-800">{alumni.name}</span>? Anda tidak akan melihat profil ini di direktori, dan koneksi yang ada akan dihapus.
          </>
        }
      />

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Laporkan Alumni"
        description={`Laporkan ${alumni.name} kepada administrator institusi`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)} disabled={report.isPending}>
              Batal
            </Button>
            <Button type="submit" form="report-form" loading={report.isPending}>
              Kirim Laporan
            </Button>
          </>
        }
      >
        <form id="report-form" onSubmit={onSubmitReport} className="space-y-4">
          {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{formError}</div>}
          <Field label="Alasan" required>
            <Select name="reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} required>
              <option value="">Pilih alasan…</option>
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {REPORT_REASON_LABELS[reason]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Keterangan" hint="Opsional — jelaskan secara singkat">
            <Textarea
              name="details"
              rows={4}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Tuliskan detail yang perlu diketahui administrator…"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={clsx('mt-0.5 font-medium', value ? 'text-slate-800' : 'text-slate-400')}>{value || '—'}</p>
    </div>
  )
}
