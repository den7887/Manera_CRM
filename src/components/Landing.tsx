import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Clock3,
  Crown,
  Drama,
  Expand,
  Gift,
  Heart,
  HeartHandshake,
  ImageIcon,
  Lightbulb,
  LogIn,
  MapPin,
  MapPinned,
  Maximize2,
  Menu,
  MessageCircle,
  Music2,
  Music4,
  Phone,
  Presentation,
  Quote,
  School,
  Send,
  Shapes,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Users2,
  VenetianMask,
  View,
  Waves,
  X,
} from 'lucide-react';
import '../styles/landing-v2.css';
import { landingContent, navigationItems } from '../data/landingContentV2';
import { PhotoGallery } from './landing-v2/PhotoGallery';
import { ReviewCarousel } from './landing-v2/ReviewCarousel';
import { Notification, Task } from '../types';
import { toast } from '../utils/toast';
import { createLandingLead } from '../lib/backendApi';
import { publicSiteConfig } from '../lib/publicSiteConfig';
import { MobileOnlyGate } from './MobileOnlyGate';
import {
  getLandingTrackingContext,
  initLandingAnalytics,
  trackLandingCtaClick,
  trackLandingFormError,
  trackLandingFormStart,
  trackLandingFormSubmit,
} from '../lib/landingAnalytics';

interface LandingProps {
  onLogin: () => void;
  onAddTask: (task: Task) => void;
  onAddNotification: (notification: Notification) => void;
}

type LeadFormState = {
  childFullName: string;
  childBirthDate: string;
  parentFullName: string;
  phone: string;
  medicalRestrictions: string;
  previousActivities: string;
  discoverySource: string;
  consent: boolean;
  website: string;
};

type LeadErrors = Partial<Record<keyof LeadFormState, string>>;

const initialLeadFormState: LeadFormState = {
  childFullName: '',
  childBirthDate: '',
  parentFullName: '',
  phone: '',
  medicalRestrictions: '',
  previousActivities: '',
  discoverySource: '',
  consent: false,
  website: '',
};

const socialLinks = [
  {
    href: publicSiteConfig.whatsappLink,
    label: 'WhatsApp',
    icon: MessageCircle,
    className: 'border-emerald-200/60 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  },
  {
    href: publicSiteConfig.telegramLink,
    label: 'Telegram',
    icon: Send,
    className: 'border-sky-200/70 bg-sky-50 text-sky-900 hover:bg-sky-100',
  },
  {
    href: publicSiteConfig.instagramLink,
    label: 'Instagram',
    icon: Expand,
    className: 'border-rose-200/70 bg-rose-50 text-rose-900 hover:bg-rose-100',
  },
  {
    href: publicSiteConfig.vkLink,
    label: 'VK',
    icon: Users,
    className: 'border-blue-200/70 bg-blue-50 text-blue-900 hover:bg-blue-100',
  },
];

const aboutIcons = [Gift, School, Users, Sparkles, Music4, HeartHandshake, Sparkles, Users, Gift];
const benefitIcons = [Maximize2, View, Presentation, Lightbulb, VenetianMask, Users2];
const directionIcons = [Waves, Shapes, Activity, Drama];
const resultIcons = [Sparkles, Music2, Star, Trophy, Target, Users2, Heart];

function scrollToSection(id: string, closeMenu?: () => void) {
  document.querySelector(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  closeMenu?.();
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('.');
}

function parseAgeFromBirthDate(birthDate: string): number | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate)) {
    return null;
  }

  const [dayText, monthText, yearText] = birthDate.split('.');
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const today = new Date();
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  if (age < 0 || age > 18) {
    return null;
  }

  return age;
}

function validateLeadForm(form: LeadFormState): LeadErrors {
  const errors: LeadErrors = {};

  if (!form.childFullName.trim()) {
    errors.childFullName = 'Укажите ФИО ребёнка';
  }
  if (!form.childBirthDate.trim()) {
    errors.childBirthDate = 'Укажите дату рождения ребёнка';
  } else if (parseAgeFromBirthDate(form.childBirthDate) === null) {
    errors.childBirthDate = 'Введите дату в формате ДД.ММ.ГГГГ';
  }
  if (!form.parentFullName.trim()) {
    errors.parentFullName = 'Укажите ФИО родителя';
  }
  if (!form.phone.trim()) {
    errors.phone = 'Укажите номер телефона';
  } else if (form.phone.replace(/\D/g, '').length < 11) {
    errors.phone = 'Введите корректный номер телефона';
  }
  if (!form.medicalRestrictions.trim()) {
    errors.medicalRestrictions = 'Укажите, есть ли медицинские ограничения';
  }
  if (!form.previousActivities.trim()) {
    errors.previousActivities = 'Укажите предыдущий опыт занятий';
  }
  if (!form.discoverySource.trim()) {
    errors.discoverySource = 'Укажите, откуда узнали о студии';
  }
  if (!form.consent) {
    errors.consent = 'Нужно согласие на обработку данных';
  }

  return errors;
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  const alignClass = align === 'center' ? 'text-center items-center mx-auto max-w-3xl' : 'text-left items-start';

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-[#1e1b18] md:text-5xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-7 text-[#1e1b18]/72 sm:text-lg sm:leading-8">{description}</p> : null}
    </div>
  );
}

function SubsectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  const alignClass = align === 'center' ? 'text-center items-center mx-auto max-w-2xl' : 'text-left items-start max-w-2xl';

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight text-[#1e1b18] sm:text-4xl">{title}</h2>
      {description ? <p className="text-sm leading-7 text-[#1e1b18]/72 sm:text-base sm:leading-8">{description}</p> : null}
    </div>
  );
}

function CtaButton({
  label,
  targetId,
  variant = 'primary',
  className = '',
  onClick,
  trackingLocation = 'landing',
}: {
  label: string;
  targetId: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  onClick?: () => void;
  trackingLocation?: string;
}) {
  const baseClass =
    variant === 'primary'
      ? 'bg-[#1b523f] text-white hover:bg-[#133c2a]'
      : 'border border-emerald-900/20 bg-white/70 text-[#1e1b18] hover:bg-white';

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        trackLandingCtaClick(label, trackingLocation, targetId);
        scrollToSection(`#${targetId}`);
      }}
      className={`rich-button-shell inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition ${baseClass} ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-red-700">{children}</p>;
}

export function Landing({ onLogin, onAddTask, onAddNotification }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [form, setForm] = useState<LeadFormState>(initialLeadFormState);
  const [formErrors, setFormErrors] = useState<LeadErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const birthDateHint = useMemo(() => {
    const age = parseAgeFromBirthDate(form.childBirthDate);
    if (age === null) {
      return null;
    }
    return `Возраст: ${age} ${age === 1 ? 'год' : age > 1 && age < 5 ? 'года' : 'лет'}`;
  }, [form.childBirthDate]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 520);
      setShowFloatingCta(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let frameId = 0;
    const root = document.documentElement;

    const updateScrollVariables = () => {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / maxScroll, 1);
      const heroProgress = Math.min(scrollY / 720, 1);

      root.style.setProperty('--rich-scroll-ratio', progress.toFixed(4));
      root.style.setProperty('--rich-parallax-y', `${(scrollY * 0.16).toFixed(1)}px`);
      root.style.setProperty('--hero-shift-y', `${(scrollY * 0.14).toFixed(1)}px`);
      root.style.setProperty('--hero-progress', heroProgress.toFixed(4));
      root.style.setProperty('--hero-blur', `${(2 + heroProgress * 7).toFixed(2)}px`);
    };

    const onScroll = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateScrollVariables);
    };

    const onPointerMove = (event: PointerEvent) => {
      root.style.setProperty('--rich-pointer-x', `${((event.clientX / window.innerWidth) * 100).toFixed(2)}%`);
      root.style.setProperty('--rich-pointer-y', `${((event.clientY / window.innerHeight) * 100).toFixed(2)}%`);
    };

    updateScrollVariables();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }
    return initLandingAnalytics(publicSiteConfig.defaultSrc);
  }, []);

  useEffect(() => {
    const contacts = document.getElementById('contacts');
    if (!contacts || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setContactsVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(contacts);
    return () => observer.disconnect();
  }, []);

  const handleFieldChange = (field: keyof LeadFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const validationErrors = validateLeadForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      trackLandingFormError('validation_failed', { fields: Object.keys(validationErrors) });
      toast.error('Проверьте поля формы');
      return;
    }

    setIsSubmitting(true);
    const now = Date.now();
    const createdAt = new Date();
    const tracking = getLandingTrackingContext();

    try {
      await createLandingLead({
        parent_full_name: form.parentFullName.trim(),
        phone: form.phone.trim(),
        child_full_name: form.childFullName.trim(),
        child_birth_date: form.childBirthDate.trim(),
        medical_restrictions: form.medicalRestrictions.trim(),
        previous_activities: form.previousActivities.trim(),
        discovery_source: form.discoverySource.trim(),
        consent: Boolean(form.consent),
        website: form.website.trim(),
        session_id: tracking.sessionId || undefined,
        source: tracking.source,
      });

      const task: Task = {
        id: `landing-task-${now}`,
        title: `Новая заявка: ${form.parentFullName}`,
        description: [
          `Ребёнок: ${form.childFullName}`,
          `Дата рождения: ${form.childBirthDate}`,
          `Телефон: ${form.phone}`,
          `Медицинские ограничения: ${form.medicalRestrictions}`,
          `Опыт: ${form.previousActivities}`,
          `Источник: ${form.discoverySource}`,
        ].join('\n'),
        type: 'communication',
        priority: 'high',
        status: 'todo',
        assigneeId: 'admin-1',
        assigneeName: 'Администратор',
        createdBy: 'system',
        createdByName: 'Лендинг',
        createdAt,
        dueDate: new Date(now + 24 * 60 * 60 * 1000),
        relatedUserName: form.parentFullName,
        relatedChildName: form.childFullName,
        notes: 'Заявка создана с публичного лендинга.',
        isAutoGenerated: true,
      };

      const notification: Notification = {
        id: `landing-notification-${now}`,
        type: 'trial_class',
        priority: 'high',
        title: 'Новая заявка с лендинга',
        message: `${form.parentFullName} оставил(а) заявку на пробный урок.`,
        additionalInfo: `Телефон: ${form.phone}`,
        highlightedData: {
          parentName: form.parentFullName,
          parentPhone: form.phone,
        },
        createdAt,
        forRoles: ['owner', 'admin'],
        metadata: {
          source: 'landing_source_migrated',
          childFullName: form.childFullName,
          childBirthDate: form.childBirthDate,
          medicalRestrictions: form.medicalRestrictions,
          previousActivities: form.previousActivities,
          discoverySource: form.discoverySource,
        },
      };

      onAddTask(task);
      onAddNotification(notification);

      setForm(initialLeadFormState);
      setFormErrors({});
      trackLandingFormSubmit({ discoverySource: form.discoverySource.trim() });
      toast.success('Заявка отправлена. Мы свяжемся с вами в ближайшее время.');
    } catch (error) {
      console.error('Не удалось сохранить лид в backend', error);
      trackLandingFormError('submit_failed', {
        details: error instanceof Error ? error.message : 'unknown_error',
      });
      toast.error('Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const staticMapSrc =
    `https://static-maps.yandex.ru/1.x/?lang=ru_RU&ll=38.902792,45.096528` +
    '&z=17&l=map&size=650,420&scale=1';
  const routeLink = publicSiteConfig.routeLink;

  return (
    <>
      <div className="desktop-only-gate-screen">
        <MobileOnlyGate
          title="Откройте сайт на мобильном телефоне"
          description="Сайт доступен только в мобильной версии. Отсканируйте QR-код камерой телефона."
        />
      </div>
      <div className="mobile-only-site">
        <div className="landing-v2 min-h-screen">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="rich-ui-base-layer" />
        <div className="ambient-photo ambient-photo-f">
          <img src="/hero-collective.png" alt="" className="ambient-photo-image ambient-photo-image-soft" />
        </div>
        <div className="ambient-photo ambient-photo-g">
          <img src="/gallery/photo-12.png" alt="" className="ambient-photo-image ambient-photo-image-soft" />
        </div>
        <div className="rich-ui-orb rich-ui-orb-a" />
        <div className="rich-ui-orb rich-ui-orb-b" />
        <div className="rich-ui-orb rich-ui-orb-c" />
        <div className="rich-ui-vignette" />
        <div className="rich-ui-grain" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-[70] border-b border-emerald-900/10 bg-[#f7f1e8]/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
            <button
              type="button"
              className="min-w-0 flex items-center gap-3 text-left"
              onClick={() => scrollToSection('#hero')}
              aria-label="Перейти к началу страницы"
            >
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-700/35 bg-emerald-900/95 p-1 shadow-[0_10px_24px_rgba(18,47,37,0.2)]">
                <img src="/manera-logo.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-[6px]" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold leading-none text-emerald-900 sm:text-2xl">{landingContent.brand}</div>
                <div className="mt-1 hidden text-[10px] uppercase tracking-[0.24em] text-[#1e1b18]/55 sm:block sm:text-xs">
                  {landingContent.subtitle}
                </div>
              </div>
            </button>

            <nav className="hidden items-center gap-5 xl:flex">
              {navigationItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className="nav-link text-sm font-medium text-[#1e1b18]/70 transition hover:text-emerald-800"
                  onClick={() => scrollToSection(item.href)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-2 xl:flex">
              <button
                type="button"
                onClick={onLogin}
                className="rounded-2xl border border-emerald-900/20 px-4 py-2.5 text-sm font-medium text-[#1e1b18] transition hover:bg-white"
              >
                Войти в CRM
              </button>
              <CtaButton label="Записаться на пробный урок" targetId="form" />
            </div>

            <div className="flex items-center gap-2 xl:hidden">
              <button
                type="button"
                onClick={onLogin}
                aria-label="Войти в личный кабинет"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/75 px-3 py-2.5 text-xs font-medium text-emerald-900"
              >
                <LogIn className="h-4 w-4" />
                <span>Вход</span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-full border border-emerald-900/10 p-2.5 text-emerald-900"
                aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                onClick={() => setMobileMenuOpen((value) => !value)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div
            className={`fixed inset-x-0 bottom-0 top-[61px] z-[60] border-t border-emerald-900/10 bg-[#f7f1e8] transition duration-300 xl:hidden sm:top-[73px] ${
              mobileMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
          >
            <div className="max-h-[calc(100dvh-61px)] overflow-y-auto sm:max-h-[calc(100dvh-73px)]">
              <div className="mx-auto flex min-h-[calc(100dvh-61px)] w-full max-w-7xl flex-col gap-4 bg-[#f7f1e8] px-4 py-5 sm:min-h-[calc(100dvh-73px)] sm:px-6 sm:py-6">
                <div className="rounded-[28px] border border-[#ebe1d4] bg-[#fbf7f0] p-2 shadow-[0_24px_48px_rgba(18,47,37,0.08)]">
                  {navigationItems
                    .filter((item) => item.label !== 'Записаться на пробный урок')
                    .map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        className="w-full rounded-[22px] px-4 py-4 text-left text-base font-medium text-[#1e1b18]/80 transition hover:bg-emerald-50/80"
                        onClick={() => scrollToSection(item.href, () => setMobileMenuOpen(false))}
                      >
                        {item.label}
                      </button>
                    ))}
                </div>

                <div className="mt-auto grid gap-3 rounded-[28px] border border-[#ebe1d4] bg-[#fbf7f0] p-3 shadow-[0_20px_40px_rgba(18,47,37,0.06)]">
                  <button
                    type="button"
                    className="rounded-2xl border border-emerald-900/20 px-4 py-3 text-sm font-medium text-[#1e1b18] transition hover:bg-white"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogin();
                    }}
                  >
                    Войти в личный кабинет
                  </button>
                  <CtaButton
                    label="Записаться на пробный урок"
                    targetId="form"
                    className="w-full justify-center py-4 text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          <section id="hero" className="relative overflow-hidden pt-0 sm:pt-4">
            <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[linear-gradient(180deg,rgba(251,248,242,0.68)_0%,rgba(247,241,232,0.86)_46%,rgba(247,241,232,1)_100%)] sm:h-[720px]" />

            <div className="mx-auto grid w-full max-w-7xl items-start gap-5 px-4 pb-10 pt-1 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-fit rounded-[24px] border border-emerald-700/30 bg-emerald-900/95 p-1.5 shadow-[0_18px_40px_rgba(18,47,37,0.16)] sm:rounded-[32px] sm:p-2">
                    <img src="/manera-logo.png" alt="Логотип студии Манера" className="h-16 w-auto rounded-[8px] sm:h-24" />
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-[10px] text-emerald-800 shadow-[0_18px_40px_rgba(18,47,37,0.08)] sm:px-4 sm:py-2 sm:text-sm">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {landingContent.hero.openDayLabel}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm sm:tracking-[0.28em]">
                    {landingContent.subtitle}
                  </p>
                  <h1 className="hero-title-mask max-w-4xl text-4xl font-semibold leading-[0.95] text-[#1e1b18] sm:text-6xl lg:text-7xl">
                    {landingContent.brand}
                  </h1>
                  <h2 className="max-w-3xl text-2xl font-semibold leading-tight text-emerald-900 sm:text-4xl">
                    {landingContent.hero.title}
                  </h2>
                  <p className="max-w-2xl text-base leading-7 text-[#1e1b18]/80 sm:text-lg sm:leading-8">
                    {landingContent.hero.description}
                  </p>
                  <div className="max-w-2xl space-y-2 text-base leading-7 text-[#1e1b18]/75 sm:text-lg sm:leading-8">
                    {landingContent.hero.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <CtaButton label={landingContent.hero.primaryCta} targetId="form" className="w-full justify-center py-3.5 text-sm sm:w-auto sm:py-4 sm:text-base" />
                  <CtaButton
                    label={landingContent.hero.secondaryCta}
                    targetId="about"
                    variant="secondary"
                    className="w-full justify-center py-3.5 text-sm sm:w-auto sm:py-4 sm:text-base"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/84 p-4 shadow-[0_26px_80px_rgba(18,47,37,0.1)] backdrop-blur sm:p-8">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37] to-[#1b523f]" />
                <div className="grid gap-4 sm:gap-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 sm:rounded-2xl sm:p-3">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#1e1b18]/45 sm:text-sm sm:tracking-[0.22em]">
                          Адрес студии
                        </p>
                        <p className="mt-0.5 text-sm font-semibold leading-tight text-[#1e1b18] sm:mt-1 sm:text-lg">
                          {landingContent.hero.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-4 text-white shadow-[0_24px_40px_rgba(18,47,37,0.2)] sm:rounded-[24px] sm:p-6">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 sm:text-sm sm:tracking-[0.24em]">
                      {landingContent.hero.groupLabel}
                    </p>
                    <p className="mt-2 text-xl font-semibold leading-tight sm:mt-3 sm:text-4xl">{landingContent.hero.openDayLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="section-shell">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr]">
              <div>
                <div className="sticky top-20">
                  <SectionHeading
                    eyebrow={landingContent.openDay.eyebrow}
                    title={landingContent.openDay.title}
                    description={landingContent.openDay.description}
                  />
                  <div className="mt-5">
                    <CtaButton label={landingContent.openDay.ctaLabel} targetId="form" className="justify-center py-3.5 text-sm sm:text-base" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {landingContent.openDay.items.map((item, index) => {
                  const Icon = aboutIcons[index];
                  return (
                    <div
                      key={item.text}
                      className={`relative flex h-full items-start gap-4 rounded-[28px] border p-5 shadow-[0_20px_44px_rgba(18,47,37,0.08)] backdrop-blur ${
                        item.highlight ? 'border-[#D4AF37]/35 bg-[#FFF7E7]' : 'border-white/70 bg-white/82'
                      }`}
                    >
                      <span className="absolute right-5 top-5 inline-flex min-w-10 justify-center rounded-full bg-[#133C2A]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#133C2A]/55">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className={`rounded-2xl p-3 ${item.highlight ? 'bg-[#F8E5B0] text-[#8B6B00]' : 'bg-emerald-50 text-emerald-700'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className={`pr-12 text-base leading-8 ${item.highlight ? 'font-semibold text-emerald-950' : 'text-[#1e1b18]/80'}`}>
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="benefits" className="section-shell">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <SectionHeading
                eyebrow={landingContent.benefitsSection.eyebrow}
                title={landingContent.benefitsSection.title}
                description={landingContent.benefitsSection.description}
              />

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {landingContent.benefits.map((benefit, index) => {
                  const Icon = benefitIcons[index];
                  return (
                    <article
                      key={benefit.title}
                      className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_44px_rgba(18,47,37,0.08)] backdrop-blur"
                    >
                      <div className="flex items-start gap-4">
                        <span className="min-w-[2.5rem] text-2xl font-semibold leading-none text-emerald-900/14 sm:text-4xl">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="inline-flex rounded-2xl bg-white/70 p-3 text-emerald-700 shadow-[0_14px_30px_rgba(18,47,37,0.06)] backdrop-blur">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold leading-tight text-[#1e1b18] sm:text-2xl">{benefit.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#1e1b18]/70">{benefit.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="gallery" className="section-shell">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <PhotoGallery photos={[...landingContent.gallery]} />
            </div>
          </section>

          <section className="section-shell">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 xl:grid-cols-2 xl:gap-8">
              <div id="directions" className="scroll-mt-24">
                <SubsectionHeading
                  eyebrow={landingContent.programSection.eyebrow}
                  title={landingContent.programSection.title}
                  description={landingContent.programSection.description}
                />

                <div className="mt-6 border-y border-emerald-900/10">
                  {landingContent.directions.map((direction, index) => {
                    const Icon = directionIcons[index];
                    return (
                      <article key={direction.title} className="grid gap-4 border-b border-emerald-900/10 py-5 last:border-b-0 sm:grid-cols-[auto_1fr] sm:gap-5 sm:py-6">
                        <div className="flex items-start gap-4 sm:block">
                          <span className="min-w-[3.5rem] text-3xl font-semibold leading-none text-emerald-900/14 sm:text-5xl">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="inline-flex rounded-2xl bg-[#F8E5B0] p-3 text-[#8B6B00]">
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold leading-tight text-[#1e1b18] sm:text-[2rem]">{direction.title}</h3>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{direction.details}</p>
                          <p className="mt-3 max-w-[38ch] text-sm leading-7 text-[#1e1b18]/70">{direction.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div id="results" className="scroll-mt-24 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(251,247,240,0.84))] p-5 shadow-[0_26px_70px_rgba(18,47,37,0.07)] backdrop-blur sm:p-7">
                <SubsectionHeading
                  eyebrow={landingContent.resultsSection.eyebrow}
                  title={landingContent.resultsSection.title}
                  description={landingContent.resultsSection.description}
                />

                <div className="relative mt-6 pl-6 sm:pl-8">
                  <div className="absolute left-2 top-0 h-full w-px bg-gradient-to-b from-emerald-300/0 via-emerald-700/25 to-emerald-300/0 sm:left-3" />
                  {landingContent.results.slice(0, 4).map((item, index) => {
                    const Icon = resultIcons[index];
                    return (
                      <article key={item.title} className="relative pb-5 last:pb-0">
                        <div className="absolute left-[-1.75rem] top-3 h-3 w-3 rounded-full bg-emerald-700 shadow-[0_0_0_6px_rgba(47,137,104,0.12)] sm:left-[-2rem]" />
                        <div className="flex items-start gap-4">
                          <div className="mt-1 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800/45">
                              {String(index + 1).padStart(2, '0')}
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#1e1b18]">{item.title}</h3>
                            <p className="mt-3 max-w-[34ch] text-sm leading-7 text-[#1e1b18]/70">{item.description}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="section-shell">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 xl:space-y-8">
              <div className="grid gap-6">
                <div id="schedule" className="scroll-mt-24 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(251,247,240,0.9))] p-5 shadow-[0_26px_70px_rgba(18,47,37,0.07)] backdrop-blur sm:p-7">
                  <SubsectionHeading
                    eyebrow={landingContent.scheduleSection.eyebrow}
                    title={landingContent.scheduleSection.title}
                    description="Расписание собрано по форматам и возрастам, чтобы быстро понять, какой ритм занятий подойдёт именно вам."
                  />

                  <div className="mt-6 overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white/60">
                    {landingContent.schedule.map((day) => (
                      <article key={day.day} className="grid gap-4 border-b border-emerald-900/10 px-4 py-4 last:border-b-0 sm:px-5 sm:py-5 lg:grid-cols-[170px_1fr]">
                        <div className="flex items-start justify-between gap-3 lg:block">
                          <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            {day.format}
                          </div>
                          <div className="mt-0 inline-flex rounded-xl bg-[#F8E5B0] p-2 text-[#8B6B00] lg:mt-3">
                            {day.format === 'ПРО' ? <CalendarDays className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          </div>
                          <h3 className="hidden text-2xl font-semibold text-[#1e1b18] lg:mt-3 lg:block">{day.day}</h3>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-[#1e1b18] lg:hidden">{day.day}</h3>
                          <ul className="mt-3 space-y-2">
                            {day.items.map((item) => (
                              <li key={item} className="rounded-[18px] bg-[#f7f1e8] px-3 py-2.5 text-[11px] leading-relaxed text-[#1e1b18]/80 sm:text-xs">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <div id="subscriptions" className="scroll-mt-24 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(251,247,240,0.94))] p-5 shadow-[0_26px_70px_rgba(18,47,37,0.07)] backdrop-blur sm:p-7">
                <SubsectionHeading
                  eyebrow={landingContent.subscriptionsSection.eyebrow}
                  title={landingContent.subscriptionsSection.title}
                  description={landingContent.subscriptionsSection.description}
                  align="center"
                />

                <div className="mt-6 overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white/55">
                  {landingContent.subscriptions.map((subscription, index) => (
                    <article
                      key={subscription.title}
                      className={
                        subscription.accent
                          ? 'grid gap-5 border-b border-emerald-700/20 bg-emerald-900 px-5 py-5 text-white last:border-b-0 sm:px-6 sm:py-6 xl:grid-cols-[1.1fr_1.45fr_1.1fr_auto] xl:items-start'
                          : 'grid gap-5 border-b border-emerald-900/10 px-5 py-5 last:border-b-0 sm:px-6 sm:py-6 xl:grid-cols-[1.1fr_1.45fr_1.1fr_auto] xl:items-start'
                      }
                    >
                      <div className="relative xl:pr-3">
                        {!subscription.accent ? (
                          <span className="absolute right-0 top-0 inline-flex min-w-10 justify-center rounded-full bg-[#133C2A]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#133C2A]/55">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        ) : null}
                        {subscription.accent ? (
                          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs text-white/80 sm:px-4 sm:text-sm">
                            <Crown className="h-4 w-4 text-[#D4AF37]" />
                            Самый насыщенный формат
                          </div>
                        ) : null}
                        <p className={`text-sm uppercase tracking-[0.24em] ${subscription.accent ? 'text-white/70' : 'text-emerald-700'}`}>
                          {subscription.price}
                        </p>
                        <h3 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{subscription.title}</h3>
                        {subscription.note ? (
                          <p className={`mt-3 text-sm leading-6 ${subscription.accent ? 'text-white/70' : 'text-[#1e1b18]/55'}`}>
                            {subscription.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-current/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] opacity-70">Кому подходит</p>
                        <p className="mt-3 leading-7 opacity-90">{subscription.audience}</p>
                      </div>

                      <ul className="space-y-3">
                        {subscription.includes.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-sm leading-7 opacity-90">
                            <span className={`mt-2 h-2 w-2 rounded-full ${subscription.accent ? 'bg-[#D4AF37]' : 'bg-emerald-600'}`} />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <div className="xl:justify-self-end">
                        <CtaButton label="Записаться на пробный урок" targetId="form" className="w-full justify-center xl:w-auto" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="form" className="section-shell">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="sticky top-24">
                  <SectionHeading
                    eyebrow={landingContent.form.eyebrow}
                    title={landingContent.form.title}
                    description={landingContent.form.description}
                  />

                  <div className="mt-6 rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_44px_rgba(18,47,37,0.08)] backdrop-blur">
                    <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">Что будет дальше</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[#1e1b18]/70">
                      {landingContent.form.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleFormSubmit}
                onFocus={trackLandingFormStart}
                className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-8"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#1e1b18]">ФИО ребёнка</span>
                    <input
                      value={form.childFullName}
                      onChange={(event) => handleFieldChange('childFullName', event.target.value)}
                      className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                    />
                    {formErrors.childFullName ? <FieldError>{formErrors.childFullName}</FieldError> : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#1e1b18]">Дата рождения ребёнка</span>
                    <input
                      value={form.childBirthDate}
                      placeholder="05.08.2011"
                      onChange={(event) => handleFieldChange('childBirthDate', formatBirthDateInput(event.target.value))}
                      className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                    />
                    {formErrors.childBirthDate ? (
                      <FieldError>{formErrors.childBirthDate}</FieldError>
                    ) : birthDateHint ? (
                      <p className="mt-2 text-sm text-[#1e1b18]/55">{birthDateHint}</p>
                    ) : (
                      <p className="mt-2 text-sm text-[#1e1b18]/55">Укажите в формате ДД.ММ.ГГГГ</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#1e1b18]">ФИО родителя</span>
                    <input
                      value={form.parentFullName}
                      onChange={(event) => handleFieldChange('parentFullName', event.target.value)}
                      className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                    />
                    {formErrors.parentFullName ? <FieldError>{formErrors.parentFullName}</FieldError> : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#1e1b18]">Контактный номер телефона</span>
                    <input
                      value={form.phone}
                      placeholder="+7 (900) 000-00-00"
                      onChange={(event) => handleFieldChange('phone', event.target.value)}
                      className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                    />
                    {formErrors.phone ? <FieldError>{formErrors.phone}</FieldError> : null}
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#1e1b18]">Есть ли медицинские ограничения у ребёнка?</span>
                  <textarea
                    value={form.medicalRestrictions}
                    rows={4}
                    placeholder="Если ограничений нет, напишите: Нет"
                    onChange={(event) => handleFieldChange('medicalRestrictions', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                  />
                  {formErrors.medicalRestrictions ? <FieldError>{formErrors.medicalRestrictions}</FieldError> : null}
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#1e1b18]">Занимались ранее танцами, спортом? Каким видом направления?</span>
                  <textarea
                    value={form.previousActivities}
                    rows={4}
                    placeholder="Например: хореография 2 года, гимнастика, не занимались ранее"
                    onChange={(event) => handleFieldChange('previousActivities', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                  />
                  {formErrors.previousActivities ? <FieldError>{formErrors.previousActivities}</FieldError> : null}
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#1e1b18]">Как Вы узнали о нашей студии?</span>
                  <input
                    value={form.discoverySource}
                    placeholder="Например: QR-код, рекомендация, Telegram, Instagram"
                    onChange={(event) => handleFieldChange('discoverySource', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-sm text-[#1e1b18] outline-none transition focus:border-emerald-500"
                  />
                  {formErrors.discoverySource ? <FieldError>{formErrors.discoverySource}</FieldError> : null}
                </label>

                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(event) => handleFieldChange('website', event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <label className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => handleFieldChange('consent', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-emerald-700 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span className="text-sm leading-6 text-[#1e1b18]/75">
                    Согласен(на) с{' '}
                    <a href="/docs/politika-personalnyh-dannyh.pdf" target="_blank" rel="noreferrer" className="text-emerald-800 underline underline-offset-2">
                      политикой обработки персональных данных
                    </a>{' '}
                    и{' '}
                    <a href="/docs/dogovor-oferty.pdf" target="_blank" rel="noreferrer" className="text-emerald-800 underline underline-offset-2">
                      договором оферты
                    </a>
                    .
                  </span>
                </label>
                {formErrors.consent ? <FieldError>{formErrors.consent}</FieldError> : null}

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b523f] px-5 py-4 text-base font-medium text-white transition hover:bg-[#133c2a] disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[220px] sm:w-auto"
                  >
                    {isSubmitting ? 'Отправляем...' : 'Записаться на пробный урок'}
                    {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>

                  <p className="text-sm leading-6 text-[#1e1b18]/60">
                    Нажимая на кнопку, вы соглашаетесь на обработку персональных данных.
                  </p>
                </div>
              </form>
            </div>
          </section>

          <section className="section-shell">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
              <div id="reviews" className="min-w-0 scroll-mt-24">
                <ReviewCarousel featuredReview={landingContent.featuredReview} reviews={[...landingContent.reviews]} />
              </div>

              <div id="faq" className="scroll-mt-24 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(251,247,240,0.88))] p-5 shadow-[0_26px_70px_rgba(18,47,37,0.07)] backdrop-blur sm:p-7">
                <SubsectionHeading
                  eyebrow="Вопросы"
                  title="Частые вопросы родителей перед записью"
                  description="Собрали ответы рядом с отзывами, чтобы решение принималось спокойно и без лишних поисков по странице."
                />

                <div className="mt-6 overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white/55">
                  {landingContent.faq.map((item, index) => {
                    const open = index === openFaqIndex;
                    return (
                      <div key={item.question} className="overflow-hidden border-b border-emerald-900/10 last:border-b-0">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                          onClick={() => setOpenFaqIndex((current) => (current === index ? null : index))}
                        >
                          <span className="min-w-0 break-words text-base font-semibold leading-7 text-[#1e1b18] sm:text-lg">
                            {item.question}
                          </span>
                          <ChevronDown className={`h-5 w-5 flex-none text-emerald-700 transition ${open ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden">
                            <p className="whitespace-pre-line break-words px-5 pb-5 text-sm leading-7 text-[#1e1b18]/70 sm:px-6 sm:pb-6 sm:text-base sm:leading-8">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section id="contacts" className="scroll-mt-24 pb-24 pt-12 md:pb-20 sm:pt-14">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <SectionHeading eyebrow="Контакты" title="Контакты студии" />

                <div className="mt-6 space-y-4 sm:mt-8">
                  <a
                    href={routeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-start gap-4 rounded-[26px] border border-white/70 bg-white/80 p-5 text-left shadow-sm transition duration-300 hover:border-emerald-500/30 hover:-translate-y-0.5 sm:p-6"
                  >
                    <MapPinned className="mt-1 h-5 w-5 text-emerald-700" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#1e1b18]/45 sm:text-sm sm:tracking-[0.2em]">Адрес</p>
                      <p className="mt-2 break-words text-base leading-7 text-[#1e1b18] sm:text-lg">{landingContent.contacts.address}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-700">Открыть в Яндекс Картах →</p>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-sm sm:p-6">
                    <Phone className="mt-1 h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#1e1b18]/45 sm:text-sm sm:tracking-[0.2em]">Телефон</p>
                      <a href={landingContent.contacts.phoneHref} className="mt-2 block text-base font-medium text-[#1e1b18] transition hover:text-emerald-700 sm:text-lg">
                        {landingContent.contacts.phoneDisplay}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={routeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b523f] px-5 py-4 text-sm font-medium text-white transition hover:bg-[#133c2a]"
                  >
                    <MapPinned className="h-4 w-4" />
                    {landingContent.contacts.routeLabel}
                  </a>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Мы в соцсетях</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {socialLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-start gap-2 rounded-2xl border px-5 py-4 text-sm font-medium transition ${item.className}`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="h-full min-h-[280px] overflow-hidden rounded-[26px] border border-white/70 bg-white/85 p-2 shadow-sm sm:min-h-[360px] sm:p-3">
                <a href={routeLink} target="_blank" rel="noreferrer" className="group relative block h-full w-full overflow-hidden rounded-[22px] bg-[#dfe6de]">
                  <img
                    src={staticMapSrc}
                    alt="Карта: Краснодар, улица Ивана Беличенко, 89А"
                    className="h-full min-h-[280px] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12372c]/16 via-transparent to-white/8" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[85%]">
                    <div className="relative h-[52px] w-[40px]">
                      <div className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-white/90 bg-[#1B523F] shadow-[0_12px_28px_rgba(18,47,37,0.24)]">
                        <img
                          src="/manera-logo.png"
                          alt=""
                          aria-hidden="true"
                          className="absolute left-1/2 top-1/2 h-[24px] w-[24px] -translate-x-1/2 -translate-y-1/2 object-contain brightness-0 invert"
                        />
                      </div>
                      <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[14px] border-x-transparent border-t-[#1B523F] drop-shadow-[0_8px_14px_rgba(18,47,37,0.22)]" />
                    </div>
                  </div>
                  <div className="absolute inset-x-4 bottom-4 rounded-[20px] bg-white/88 px-4 py-3 shadow-[0_12px_24px_rgba(12,25,20,0.12)] backdrop-blur-sm sm:inset-x-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Яндекс Карты</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#1e1b18] sm:text-base">Краснодар, улица Ивана Беличенко, 89А</p>
                  </div>
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-emerald-900/10 bg-white/60 py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 text-sm text-[#1e1b18]/75 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} Студия «Манера»</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
              <a href="/docs/politika-personalnyh-dannyh.pdf" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-emerald-800">
                Политика обработки персональных данных
              </a>
              <a href="/docs/dogovor-oferty.pdf" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-emerald-800">
                Договор оферты
              </a>
            </div>
          </div>
        </footer>

        <button
          type="button"
          aria-label="Прокрутить в начало страницы"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-900/12 bg-white/88 text-emerald-900 shadow-[0_16px_30px_rgba(18,47,37,0.16)] backdrop-blur transition duration-300 hover:bg-white ${
            showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>

        <div
          className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 px-4 transition duration-300 md:hidden ${
            showFloatingCta && !contactsVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
          }`}
        >
          <CtaButton label="Записаться на пробный урок" targetId="form" className="flex w-full justify-center py-4 text-base shadow-lg" />
        </div>
        </div>
        </div>
      </div>
    </>
  );
}
