import { Expand, Quote } from 'lucide-react';
import { CSSProperties, useState } from 'react';
import { landingContent } from '../../data/landingContentV2';
import { cn } from '../ui/utils';
import { MediaLightbox, type MediaLightboxItem } from './MediaLightbox';

type FeaturedReview = {
  author: string;
  text: string;
  note: string;
};

type ReviewCarouselProps = {
  featuredReview: FeaturedReview;
  reviews: MediaLightboxItem[];
};

const tiltClasses = [
  'md:rotate-[-1.2deg]',
  'md:rotate-[0.8deg]',
  'md:rotate-[-0.6deg]',
  'md:rotate-[1deg]',
  'md:rotate-[-0.8deg]',
  'md:rotate-[0.6deg]',
];

function getReviewWidth(width: number, height: number) {
  const ratio = width / height;
  const previewWidth = Math.round(Math.min(380, Math.max(210, ratio * 260)));
  return `min(82vw, ${previewWidth}px)`;
}

export function ReviewCarousel({ featuredReview, reviews }: ReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const duplicatedReviews = [...reviews, ...reviews];

  const close = () => setActiveIndex(null);
  const previous = () => setActiveIndex((current) => (current === null ? null : current === 0 ? reviews.length - 1 : current - 1));
  const next = () =>
    setActiveIndex((current) => (current === null ? null : current === reviews.length - 1 ? 0 : current + 1));

  return (
    <>
      <div className="min-w-0 max-w-full space-y-5">
        <div className="grid gap-4 border-y border-emerald-900/10 py-5 sm:py-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[#bf9130]">
              <Quote className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm sm:tracking-[0.22em]">
                {landingContent.reviewsSection.eyebrow}
              </p>
            </div>
            <p className="mt-3 text-2xl font-semibold leading-tight text-[#1e1b18] sm:text-4xl">{landingContent.reviewsSection.title}</p>
            <p className="mt-3 text-sm leading-7 text-[#1e1b18]/70 sm:text-base sm:leading-8">{landingContent.reviewsSection.description}</p>
            <p className="mt-4 text-xl font-semibold leading-tight text-[#1e1b18] sm:mt-5 sm:text-3xl">{featuredReview.text}</p>
            <p className="mt-3 text-sm leading-7 text-[#1e1b18]/70 sm:text-base sm:leading-8">{featuredReview.note}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[300px]">
            <div className="rounded-[18px] bg-white/70 px-3 py-3 text-center shadow-[0_14px_30px_rgba(18,47,37,0.06)] backdrop-blur">
              <p className="text-xl font-semibold text-emerald-900 sm:text-3xl">{reviews.length}</p>
              <p className="mt-1 text-[10px] leading-4 text-[#1e1b18]/65 sm:text-xs sm:leading-5">живых отзывов</p>
            </div>
            <div className="rounded-[18px] bg-white/70 px-3 py-3 text-center shadow-[0_14px_30px_rgba(18,47,37,0.06)] backdrop-blur">
              <p className="text-xl font-semibold text-emerald-900 sm:text-3xl">100%</p>
              <p className="mt-1 text-[10px] leading-4 text-[#1e1b18]/65 sm:text-xs sm:leading-5">реальные сообщения</p>
            </div>
            <div className="rounded-[18px] bg-white/70 px-3 py-3 text-center shadow-[0_14px_30px_rgba(18,47,37,0.06)] backdrop-blur">
              <p className="text-xl font-semibold text-emerald-900 sm:text-3xl">По клику</p>
              <p className="mt-1 text-[10px] leading-4 text-[#1e1b18]/65 sm:text-xs sm:leading-5">открыть полностью</p>
            </div>
          </div>
        </div>

        <div className="marquee-viewport w-full max-w-full pb-4">
          <div
            className="marquee-track flex w-max gap-4 pr-4"
            data-paused={activeIndex !== null}
            style={
              {
                '--marquee-duration': '46s',
                '--marquee-gap': '1rem',
              } as CSSProperties
            }
          >
            {duplicatedReviews.map((review, index) => (
              <button
                key={`${review.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index % reviews.length)}
                style={{ width: getReviewWidth(review.width, review.height) }}
                className={cn(
                  'group relative block flex-none overflow-hidden rounded-[24px] border border-white/55 bg-white/72 text-left shadow-[0_18px_44px_rgba(18,47,37,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(18,47,37,0.12)] sm:rounded-[28px]',
                  tiltClasses[index % tiltClasses.length],
                )}
                aria-label={`Открыть ${review.label}`}
              >
                <div className="relative overflow-hidden rounded-[24px]">
                  <img
                    src={review.src}
                    alt={review.alt}
                    className="block h-auto w-full rounded-[22px] transition duration-300 group-hover:scale-[1.015]"
                    loading={index < 2 ? 'eager' : 'lazy'}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/38 via-black/5 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
                    <span className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900 sm:text-xs sm:tracking-[0.18em]">
                      {review.label}
                    </span>
                    <span className="rounded-full bg-white/92 p-2 text-emerald-900">
                      <Expand className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeIndex !== null ? (
        <MediaLightbox
          items={reviews}
          activeIndex={activeIndex}
          onClose={close}
          onPrevious={previous}
          onNext={next}
          viewerTitle="Отзывы"
        />
      ) : null}
    </>
  );
}
