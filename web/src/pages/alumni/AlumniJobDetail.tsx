import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Bookmark, Briefcase, MapPin, MessageCircle, Building2, Check, FileText } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useApplyJob,
  useBookmarkJob,
  useJobVacancy,
  useStartConversation,
  useUnbookmarkJob,
} from '../../hooks/queries'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'
import { apiError } from '../../lib/api'
import { getUser } from '../../lib/auth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

const TYPE_TONES: Record<string, 'indigo' | 'sky' | 'violet' | 'amber' | 'slate'> = {
  full_time: 'indigo',
  part_time: 'sky',
  internship: 'violet',
  contract: 'amber',
  freelance: 'slate',
}

/** Build initial CV data from the logged-in user's profile. */
function defaultCvData() {
  const user = getUser()
  const a = user?.alumni
  return {
    full_name: a?.name ?? user?.name ?? '',
    email: user?.email ?? '',
    phone: a?.phone ?? user?.phone ?? '',
    gender: a?.gender ?? user?.gender ?? '',
    birth_date: a?.birth_date ?? user?.birth_date ?? '',
    birthplace: a?.birthplace_label ?? a?.birthplace ?? user?.birthplace ?? '',
    address: a?.address ?? user?.address ?? '',
    department: a?.department ?? '',
    graduation_year: a?.graduation_year != null ? String(a.graduation_year) : '',
    education: [a?.department, a?.graduation_year ? `'${String(a.graduation_year).slice(2)}` : ''].filter(Boolean).join(' · '),
    skills: a?.skills ?? [],
    experience: [a?.position, a?.company_name].filter(Boolean).join(' di ') || '',
    interests: '',
  }
}

type CvData = ReturnType<typeof defaultCvData>

export function AlumniJobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: job, isPending, isError, refetch } = useJobVacancy(id)
  const startChat = useStartConversation()

  const [applyOpen, setApplyOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null)
  const [cvData, setCvData] = useState<CvData>(defaultCvData)
  const [skillInput, setSkillInput] = useState('')
  const apply = useApplyJob(id ?? '')

  const bookmark = useBookmarkJob(id ?? '')
  const unbookmark = useUnbookmarkJob(id ?? '')

  const updateCv = (field: keyof CvData, value: string) =>
    setCvData((prev) => ({ ...prev, [field]: value }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !cvData.skills.includes(s)) {
      setCvData((prev) => ({ ...prev, skills: [...prev.skills, s] }))
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    setCvData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))

  const askRecruiter = async () => {
    if (!job) return
    try {
      const conversation = await startChat.mutateAsync({ job_vacancy_id: job.id })
      navigate(`/chat/${conversation.id}`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const toggleBookmark = async () => {
    if (!job) return
    try {
      if (job.bookmarked) {
        await unbookmark.mutateAsync()
        toast('Lowongan dihapus dari simpanan')
      } else {
        await bookmark.mutateAsync()
        toast('Lowongan disimpan')
      }
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const submitApply = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apply.mutateAsync({
        cover_letter: coverLetter.trim() || undefined,
        portfolio: portfolioFile ?? undefined,
        cv_data: cvData,
      })
      toast('Lamaran berhasil dikirim')
      setApplyOpen(false)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Detail Lowongan"
        subtitle="Informasi lengkap dan cara melamar"
        actions={
          <Link to="/lowongan" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700">
            <ArrowLeft className="size-4" /> Kembali ke daftar
          </Link>
        }
      />

      {isPending ? (
        <LoadingState label="Memuat detail lowongan…" />
      ) : isError || !job ? (
        <ErrorState message="Gagal memuat detail lowongan" onRetry={() => refetch()} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-900 px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white">
                {(job.company_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">{job.title}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-indigo-100">
                  <Building2 className="size-4" /> {job.company_name}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {job.employment_type && (
                <Badge tone={TYPE_TONES[job.employment_type] ?? 'slate'}>
                  {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                </Badge>
              )}
              {job.location && (
                <Badge tone="slate">
                  <MapPin className="size-3.5" /> {job.location}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">Deskripsi</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                {job.description || 'Tidak ada deskripsi untuk lowongan ini.'}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-400">
                {job.posted_at ? `Diposting ${formatDate(job.posted_at)}` : 'Baru diposting'}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {job.created_by && (
                  <Button variant="secondary" onClick={askRecruiter} loading={startChat.isPending}>
                    <MessageCircle className="size-4" /> Tanya Rekruter
                  </Button>
                )}
                <Button variant="secondary" onClick={toggleBookmark} loading={bookmark.isPending || unbookmark.isPending}>
                  {job.bookmarked ? (
                    <>
                      <Check className="size-4" /> Tersimpan
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-4" /> Simpan
                    </>
                  )}
                </Button>
                {job.has_applied ? (
                  <Link
                    to="/applications"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Check className="size-4" /> Sudah Dilamar
                  </Link>
                ) : (
                  <>
                    <Button onClick={() => setApplyOpen(true)}>
                      <Briefcase className="size-4" /> Lamar Lowongan Ini
                    </Button>
                    {job.application_link && (
                      <a
                        href={job.application_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        Lamar via Link <ArrowUpRight className="size-3.5" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Kirim Lamaran"
        description={job ? `Melamar sebagai ${job.title} di ${job.company_name}` : 'Kirim lamaran'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)} disabled={apply.isPending}>
              Batal
            </Button>
            <Button type="submit" form="apply-form" loading={apply.isPending}>
              Kirim Lamaran
            </Button>
          </>
        }
      >
        <form id="apply-form" onSubmit={submitApply} className="space-y-5">
          {/* ── CV Data Section ── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <FileText className="size-4 text-indigo-600" /> Data CV
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Data diambil dari profil Anda. Silakan periksa dan perbarui sebelum mengirim.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap">
                <Input value={cvData.full_name} onChange={(e) => updateCv('full_name', e.target.value)} placeholder="Nama lengkap" />
              </Field>
              <Field label="Email">
                <Input type="email" value={cvData.email} onChange={(e) => updateCv('email', e.target.value)} placeholder="Email" />
              </Field>
              <Field label="No. HP">
                <Input value={cvData.phone} onChange={(e) => updateCv('phone', e.target.value)} placeholder="Nomor telepon" />
              </Field>
              <Field label="Jenis Kelamin">
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={cvData.gender}
                  onChange={(e) => updateCv('gender', e.target.value)}
                >
                  <option value="">— Pilih —</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </Field>
              <Field label="Tempat, Tanggal Lahir">
                <Input value={cvData.birthplace} onChange={(e) => updateCv('birthplace', e.target.value)} placeholder="Kota lahir" />
              </Field>
              <Field label="Tanggal Lahir">
                <Input type="date" value={cvData.birth_date} onChange={(e) => updateCv('birth_date', e.target.value)} />
              </Field>
              <Field label="Jurusan / Departemen" className="sm:col-span-2">
                <Input value={cvData.department} onChange={(e) => updateCv('department', e.target.value)} placeholder="Jurusan" />
              </Field>
              <Field label="Tahun Lulus">
                <Input value={cvData.graduation_year} onChange={(e) => updateCv('graduation_year', e.target.value)} placeholder="Contoh: 2024" />
              </Field>
              <Field label="Pendidikan Ringkas">
                <Input value={cvData.education} onChange={(e) => updateCv('education', e.target.value)} placeholder="Ringkasan pendidikan" />
              </Field>
              <Field label="Alamat" className="sm:col-span-2">
                <Textarea rows={2} value={cvData.address} onChange={(e) => updateCv('address', e.target.value)} placeholder="Alamat lengkap" />
              </Field>
              <Field label="Pengalaman Kerja" className="sm:col-span-2">
                <Textarea rows={2} value={cvData.experience} onChange={(e) => updateCv('experience', e.target.value)} placeholder="Pengalaman kerja / karir" />
              </Field>
              <Field label="Minat / Interest" className="sm:col-span-2">
                <Textarea rows={2} value={cvData.interests} onChange={(e) => updateCv('interests', e.target.value)} placeholder="Minat dan bidang yang diminati" />
              </Field>

              {/* Skills */}
              <Field label="Keahlian / Skills" className="sm:col-span-2">
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="Tambah keahlian, tekan Enter"
                  />
                  <Button type="button" variant="secondary" onClick={addSkill} className="shrink-0">
                    Tambah
                  </Button>
                </div>
                {cvData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cvData.skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                      >
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} className="ml-0.5 text-indigo-400 hover:text-indigo-700">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </div>

          {/* ── Cover Letter & Files ── */}
          <Field label="Surat Lamaran" hint="Opsional">
            <Textarea
              name="cover_letter"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Ceritakan singkat mengapa Anda cocok untuk posisi ini…"
            />
          </Field>
          <Field label="Portofolio" hint="PDF/DOC/JPG/PNG maks 5 MB">
            <Input type="file" name="portfolio" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setPortfolioFile(e.target.files?.[0] ?? null)} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
