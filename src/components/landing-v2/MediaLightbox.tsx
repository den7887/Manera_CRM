import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type MediaLightboxItem = {
  src: string;
  alt: string;
  width: number;
  height: number;
  label: string;
};

type MediaLightboxProps = {
  items: MediaLightboxItem[];
  activeIndex: number | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  viewerTitle: string;
};

export function MediaLightbox({
  items,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
  viewerTitle,
}: MediaLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowLeft') {
        onPrevious();
      }
      if (event.key === 'ArrowRight') {
        onNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, onClose, onPrevious, onNext]);

  if (!mounted || activeIndex === null) {
    return null;
  }

  const activeItem = items[activeIndex];

  return createPortal(
    <div className="fixed inset-0 z-[200] isolate" role="dialog" aria-modal="true" aria-label={viewerTitle}>
      <button
        type="button"
        aria-label="Закрыть просмотр"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(7,20,17,0.96)] backdrop-blur-2xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,94,72,0.20),transparent_30%),linear-gradient(180deg,rgba(7,20,17,0.22)_0%,rgba(7,20,17,0.08)_32%,rgba(7,20,17,0.22)_100%)]" />

      <div className="relative grid min-h-[100dvh] place-items-center p-3 sm:p-6">
        <div
          className="relative grid h-[min(92dvh,940px)] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(251,247,240,0.985)_0%,rgba(246,239,228,0.975)_100%)] shadow-[0_28px_120px_rgba(6,18,15,0.56)] sm:h-[min(90dvh,940px)] sm:rounded-[36px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-emerald-950/10 bg-white/60 px-3 py-3 backdrop-blur md:px-5 md:py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[11px]">
                  {viewerTitle}
                </span>
                <span className="rounded-full bg-emerald-950/6 px-3 py-1 text-xs font-medium text-[#1e1b18]/70">
                  {activeIndex + 1} / {items.length}
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-medium text-emerald-950/80 sm:text-base">{activeItem.label}</p>
            </div>

            <button
              type="button"
              aria-label="Закрыть просмотр"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/92 p-0 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative min-h-0">
            <button
              type="button"
              aria-label="Предыдущий элемент"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 p-0 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white md:inline-flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Следующий элемент"
              onClick={onNext}
              className="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 p-0 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white md:inline-flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="flex h-full items-center justify-center px-3 py-4 sm:px-6 sm:py-6 md:px-20">
              <img
                src={activeItem.src}
                alt={activeItem.alt}
                className="block h-auto max-h-full w-auto max-w-full rounded-[20px] object-contain shadow-[0_18px_60px_rgba(17,38,32,0.22)] sm:rounded-[26px]"
              />
            </div>
          </div>

          <div className="border-t border-emerald-950/10 bg-white/60 px-3 py-3 backdrop-blur md:px-5 md:py-4">
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                aria-label="Предыдущий элемент"
                onClick={onPrevious}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/92 px-3 py-3 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <div className="min-w-[84px] rounded-full bg-emerald-950/6 px-4 py-3 text-center text-xs font-semibold text-[#1e1b18]/70">
                {activeIndex + 1} / {items.length}
              </div>
              <button
                type="button"
                aria-label="Следующий элемент"
                onClick={onNext}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/92 px-3 py-3 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white"
              >
                Далее
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden items-center justify-between gap-4 md:flex">
              <p className="text-sm leading-6 text-[#1e1b18]/65">
                Изображение открыто полностью по центру экрана. Листайте стрелками или клавишами на клавиатуре.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Предыдущий элемент"
                  onClick={onPrevious}
                  className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/92 px-4 py-3 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </button>
                <button
                  type="button"
                  aria-label="Следующий элемент"
                  onClick={onNext}
                  className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/92 px-4 py-3 text-emerald-900 shadow-[0_20px_50px_rgba(18,47,37,0.12)] transition hover:bg-white"
                >
                  Далее
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
