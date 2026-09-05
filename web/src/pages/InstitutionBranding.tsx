import { useCallback, useRef, useState } from 'react'
import {
  CheckCircle2,
  Phone,
  Mail,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'
import {
  useInstitutionBranding,
  useUpdateInstitutionBranding,
  useUploadInstitutionLogo,
} from '../hooks/queries'
import type { InstitutionBranding } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { LoadingState, ErrorState } from '../components/ui/StateViews'
import { toast } from 'sonner'

export function InstitutionBranding() {
  const { data: branding, isPending, isError, refetch } = useInstitutionBranding()

  if (isPending) return <LoadingState label="Memuat branding…" />
  if (isError || !branding) {
    return <ErrorState message="Gagal memuat data branding" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Branding Institusi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kustomisasi tampilan institusi Anda di seluruh platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <LogoSection branding={branding} />
          <ColorSection branding={branding} />
          <ContactSection branding={branding} />
        </div>
        <div className="space-y-6">
          <ReportBrandingSection branding={branding} />
          <AboutSection branding={branding} />
          <FooterSection branding={branding} />
        </div>
      </div>
    </div>
  )
}

/* ── Logo Section ────────────────────────────────────────────────────────── */

function LogoSection({ branding }: { branding: InstitutionBranding }) {
  const uploadLogo = useUploadInstitutionLogo()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setPreview(URL.createObjectURL(file))
      try {
        await uploadLogo.mutateAsync(file)
        toast.success('Logo berhasil diunggah')
      } catch {
        toast.error('Gagal mengunggah logo')
        setPreview(null)
      }
    },
    [uploadLogo],
  )

  const logoSrc = preview || branding.logo_url

  return (
    <Card>
      <CardHeader title="Logo Institusi" subtitle="Logo muncul di dashboard, laporan PDF, dan email" />
      <CardContent>
        <div className="flex items-center gap-6">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden"
          >
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="h-full w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={uploadLogo.isPending}
            >
              <Upload className="mr-2 size-4" /> {logoSrc ? 'Ganti Logo' : 'Unggah Logo'}
            </Button>
            <p className="mt-2 text-xs text-slate-400">
              JPG, PNG, WebP, atau SVG. Maks 2 MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Color Section ───────────────────────────────────────────────────────── */

function ColorSection({ branding }: { branding: InstitutionBranding }) {
  const update = useUpdateInstitutionBranding()
  const [color, setColor] = useState(branding.primary_color || '#1e3a8a')

  const handleSave = useCallback(async () => {
    try {
      await update.mutateAsync({ primary_color: color })
      toast.success('Warna branding berhasil diperbarui')
    } catch {
      toast.error('Gagal memperbarui warna')
    }
  }, [update, color])

  return (
    <Card>
      <CardHeader
        title="Warna Branding"
        subtitle="Warna utama yang digunakan di seluruh platform"
      />
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-12 cursor-pointer rounded-lg border border-slate-200"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-28 font-mono"
              placeholder="#1e3a8a"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-slate-500">Preview</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            loading={update.isPending}
          >
            Simpan
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['#1e3a8a', '#059669', '#7c3aed', '#dc2626', '#d97706', '#0891b2'].map(
            (preset) => (
              <button
                key={preset}
                onClick={() => setColor(preset)}
                className="flex size-8 items-center justify-center rounded-lg border-2 transition-colors"
                style={{
                  backgroundColor: preset,
                  borderColor: color === preset ? '#1e3a8a' : 'transparent',
                }}
              >
                {color === preset && <CheckCircle2 className="size-4 text-white" />}
              </button>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Contact Section ─────────────────────────────────────────────────────── */

function ContactSection({ branding }: { branding: InstitutionBranding }) {
  const update = useUpdateInstitutionBranding()
  const [form, setForm] = useState({
    contact_email: branding.contact_email || '',
    contact_phone: branding.contact_phone || '',
  })

  const handleSave = useCallback(async () => {
    try {
      await update.mutateAsync(form)
      toast.success('Kontak berhasil diperbarui')
    } catch {
      toast.error('Gagal memperbarui kontak')
    }
  }, [update, form])

  return (
    <Card>
      <CardHeader title="Informasi Kontak" subtitle="Kontak yang ditampilkan di platform" />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="info@sekolah.sch.id"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Telepon</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="021-1234567"
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending}>
            Simpan Kontak
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Report Branding Section ─────────────────────────────────────────────── */

function ReportBrandingSection({ branding }: { branding: InstitutionBranding }) {
  const update = useUpdateInstitutionBranding()
  const [form, setForm] = useState({
    report_header: branding.report_header || '',
    report_footer: branding.report_footer || '',
  })

  const handleSave = useCallback(async () => {
    try {
      await update.mutateAsync(form)
      toast.success('Branding laporan berhasil diperbarui')
    } catch {
      toast.error('Gagal memperbarui branding laporan')
    }
  }, [update, form])

  return (
    <Card>
      <CardHeader
        title="Branding Laporan"
        subtitle="Header & footer untuk laporan PDF"
      />
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Header Laporan</label>
          <Textarea
            value={form.report_header}
            onChange={(e) => setForm({ ...form, report_header: e.target.value })}
            placeholder="Contoh: Laporan Tracer Study — Tahun 2026"
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Footer Laporan</label>
          <Textarea
            value={form.report_footer}
            onChange={(e) => setForm({ ...form, report_footer: e.target.value })}
            placeholder="Contoh: Dokumen ini digenerate otomatis oleh TracerAlumni"
            rows={2}
            className="mt-1"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending}>
            Simpan Laporan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── About Section ───────────────────────────────────────────────────────── */

function AboutSection({ branding }: { branding: InstitutionBranding }) {
  const update = useUpdateInstitutionBranding()
  const [about, setAbout] = useState(branding.about || '')

  const handleSave = useCallback(async () => {
    try {
      await update.mutateAsync({ about })
      toast.success('Tentang institusi berhasil diperbarui')
    } catch {
      toast.error('Gagal memperbarui')
    }
  }, [update, about])

  return (
    <Card>
      <CardHeader title="Tentang Institusi" subtitle="Deskripsi singkat institusi" />
      <CardContent className="space-y-4">
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Tuliskan deskripsi singkat tentang institusi Anda…"
          rows={4}
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending}>
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Footer Section ──────────────────────────────────────────────────────── */

function FooterSection({ branding }: { branding: InstitutionBranding }) {
  const update = useUpdateInstitutionBranding()
  const [footer, setFooter] = useState(branding.custom_footer || '')

  const handleSave = useCallback(async () => {
    try {
      await update.mutateAsync({ custom_footer: footer })
      toast.success('Footer berhasil diperbarui')
    } catch {
      toast.error('Gagal memperbarui footer')
    }
  }, [update, footer])

  return (
    <Card>
      <CardHeader title="Footer Kustom" subtitle="Teks footer untuk landing page" />
      <CardContent className="space-y-4">
        <Textarea
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Contoh: © 2026 SMK Nusantara. All rights reserved."
          rows={2}
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending}>
            Simpan Footer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
