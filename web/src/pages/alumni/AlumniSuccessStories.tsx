import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Sparkles } from 'lucide-react'
import { useSuccessStories } from '../../hooks/queries'
import { avatarUrl, formatDate } from '../../lib/format'
import type { SuccessStory } from '../../lib/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'

const CATEGORY_TONES: Record<string, string> = {
  career: 'bg-sky-50 text-sky-700 border-sky-200',
  study: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  entrepreneur: 'bg-amber-50 text-amber-700 border-amber-200',
  achievement: 'bg-violet-50 text-violet-700 border-violet-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function AlumniSuccessStories() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useSuccessStories({ page })

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kisah Sukses Alumni"
        subtitle="Inspirasi dari alumni yang telah melangkah lebih jauh — siapa tahu itu Anda berikutnya"
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat kisah sukses" onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada kisah sukses"
          description="Institusi Anda belum membagikan kisah sukses alumni."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

function StoryCard({ story }: { story: SuccessStory }) {
  const cover = avatarUrl(story.cover_image_url)

  return (
    <Link
      to={`/kisah-sukses/${story.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-300">
            <Sparkles className="size-8" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${CATEGORY_TONES[story.category] ?? CATEGORY_TONES.other}`}
        >
          {story.category_label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-sm leading-snug font-bold text-slate-900 group-hover:text-indigo-600">
          {story.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{story.content}</p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <CalendarDays className="size-3.5" />
            {formatDate(story.published_at)}
          </span>
          {story.alumni?.name && (
            <span className="truncate text-[11px] font-medium text-indigo-600">
              {story.alumni.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
