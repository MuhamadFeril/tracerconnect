import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, GraduationCap, Sparkles } from 'lucide-react'
import { useSuccessStory } from '../../hooks/queries'
import { avatarUrl, formatDate } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, LoadingState } from '../../components/ui/StateViews'

export function AlumniSuccessStoryDetail() {
  const { id } = useParams()
  const { data: story, isPending, isError, refetch } = useSuccessStory(id)

  if (isPending) return <LoadingState label="Memuat kisah sukses…" />
  if (isError || !story) {
    return <ErrorState message="Kisah sukses tidak ditemukan" onRetry={() => refetch()} />
  }

  const cover = avatarUrl(story.cover_image_url)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/kisah-sukses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Semua Kisah Sukses
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-[16/7] bg-slate-100">
          {cover ? (
            <img src={cover} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-300">
              <Sparkles className="size-10" />
            </div>
          )}
          <span className="absolute top-4 left-4">
            <Badge tone="indigo">{story.category_label}</Badge>
          </span>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Dipublikasikan {formatDate(story.published_at)}
            </span>
            {story.alumni?.name && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="size-3.5" />
                {story.alumni.name}
                {story.alumni.department ? ` · ${story.alumni.department}` : ''}
                {story.alumni.graduation_year ? ` · Angkatan ${story.alumni.graduation_year}` : ''}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {story.title}
          </h1>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-700">
              {story.content}
            </p>
          </div>
        </div>
      </article>

      <div className="flex justify-center">
        <Link
          to="/kisah-sukses"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
        >
          <ArrowLeft className="size-4" /> Kembali ke daftar
        </Link>
      </div>
    </div>
  )
}
