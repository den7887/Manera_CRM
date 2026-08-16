const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const runtimeApiBaseUrl =
  typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : window.location.origin)
    : 'http://localhost:8000';
const ANALYTICS_API_URL = `${configuredApiBaseUrl || runtimeApiBaseUrl}/api/analytics`;

const SESSION_STORAGE_KEY = 'manera:session';
const SOURCE_STORAGE_KEY = 'manera:source';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SCROLL_DEPTH_STEPS = [25, 50, 75, 100] as const;
const TIME_ON_PAGE_STEPS = [15, 30, 60, 120, 300] as const;
const sectionIds = ['hero', 'about', 'benefits', 'gallery', 'directions', 'results', 'audience', 'schedule', 'subscriptions', 'form', 'reviews', 'faq', 'contacts'] as const;

type SourceData = {
  src?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

type StoredSession = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
};

const state = {
  initialized: false,
  sessionId: '',
  source: {} as SourceData,
  formStarted: false,
  trackedSections: new Set<string>(),
  trackedScrollDepths: new Set<number>(),
  timerIds: [] as number[],
  observer: null as IntersectionObserver | null,
  scrollHandler: null as (() => void) | null,
};

function generateSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `manera_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage issues
  }
}

function getSourceData(defaultSrc?: string): SourceData {
  const params = new URLSearchParams(window.location.search);
  const stored = readJson<SourceData>(SOURCE_STORAGE_KEY) || {};
  const source: SourceData = {
    src: params.get('src') || stored.src || defaultSrc,
    utm_source: params.get('utm_source') || stored.utm_source || undefined,
    utm_medium: params.get('utm_medium') || stored.utm_medium || undefined,
    utm_campaign: params.get('utm_campaign') || stored.utm_campaign || undefined,
    utm_content: params.get('utm_content') || stored.utm_content || undefined,
    utm_term: params.get('utm_term') || stored.utm_term || undefined,
  };
  writeJson(SOURCE_STORAGE_KEY, source);
  return source;
}

function getOrCreateSession() {
  const now = Date.now();
  const stored = readJson<StoredSession>(SESSION_STORAGE_KEY);
  if (stored) {
    const lastSeenAt = Date.parse(stored.lastSeenAt);
    if (!Number.isNaN(lastSeenAt) && now - lastSeenAt < SESSION_TIMEOUT_MS) {
      const updated: StoredSession = { ...stored, lastSeenAt: new Date(now).toISOString() };
      writeJson(SESSION_STORAGE_KEY, updated);
      return { sessionId: stored.id, isNewSession: false };
    }
  }

  const freshSession: StoredSession = {
    id: generateSessionId(),
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
  };
  writeJson(SESSION_STORAGE_KEY, freshSession);
  return { sessionId: freshSession.id, isNewSession: true };
}

function transport(payload: object) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ANALYTICS_API_URL, blob);
    return;
  }

  void fetch(ANALYTICS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

function sendEvent(eventName: string, payload: Record<string, unknown> = {}) {
  if (!state.sessionId) {
    return;
  }

  transport({
    session_id: state.sessionId,
    event_name: eventName,
    payload: {
      ...state.source,
      path: window.location.pathname,
      ...payload,
    },
  });
}

function trackScrollDepth() {
  if (state.scrollHandler) {
    return;
  }

  state.scrollHandler = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      return;
    }

    const percent = Math.round((window.scrollY / maxScroll) * 100);
    SCROLL_DEPTH_STEPS.forEach((step) => {
      if (percent >= step && !state.trackedScrollDepths.has(step)) {
        state.trackedScrollDepths.add(step);
        sendEvent('scroll_depth', { percent: step });
      }
    });
  };

  window.addEventListener('scroll', state.scrollHandler, { passive: true });
  state.scrollHandler();
}

function trackTimeOnPage() {
  TIME_ON_PAGE_STEPS.forEach((seconds) => {
    const timerId = window.setTimeout(() => {
      sendEvent('time_on_page', { seconds });
    }, seconds * 1000);
    state.timerIds.push(timerId);
  });
}

function observeSections() {
  if (state.observer) {
    return;
  }

  state.observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting && !state.trackedSections.has(id)) {
          state.trackedSections.add(id);
          sendEvent('section_view', { section: id });
        }
      });
    },
    {
      threshold: 0.35,
      rootMargin: '0px 0px -12% 0px',
    },
  );

  sectionIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      state.observer?.observe(element);
    }
  });
}

export function initLandingAnalytics(defaultSrc?: string) {
  if (typeof window === 'undefined' || state.initialized) {
    return () => undefined;
  }

  state.initialized = true;
  state.trackedSections.clear();
  state.trackedScrollDepths.clear();
  state.timerIds = [];
  state.formStarted = false;

  const { sessionId, isNewSession } = getOrCreateSession();
  state.sessionId = sessionId;
  state.source = getSourceData(defaultSrc);

  if (isNewSession) {
    sendEvent('session_start', { startedAt: new Date().toISOString() });
  }

  sendEvent('page_view', {
    title: document.title,
    referrer: document.referrer || undefined,
  });
  sendEvent('source_tracking', state.source);

  trackScrollDepth();
  trackTimeOnPage();
  observeSections();

  return () => {
    if (state.scrollHandler) {
      window.removeEventListener('scroll', state.scrollHandler);
      state.scrollHandler = null;
    }
    state.timerIds.forEach((timerId) => window.clearTimeout(timerId));
    state.timerIds = [];
    state.observer?.disconnect();
    state.observer = null;
    state.initialized = false;
  };
}

export function getLandingTrackingContext() {
  return {
    sessionId: state.sessionId,
    source: state.source,
  };
}

export function trackLandingCtaClick(label: string, location: string, target?: string) {
  sendEvent('cta_click', { label, location, target });
}

export function trackLandingFormStart() {
  if (state.formStarted) {
    return;
  }
  state.formStarted = true;
  sendEvent('form_start');
}

export function trackLandingFormSubmit(extra: Record<string, unknown> = {}) {
  sendEvent('form_submit', extra);
}

export function trackLandingFormError(message: string, extra: Record<string, unknown> = {}) {
  sendEvent('form_error', { message, ...extra });
}
