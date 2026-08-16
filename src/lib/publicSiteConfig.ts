function resolveValue(value: string | undefined, fallback: string, invalidValues: string[] = []) {
  const normalized = String(value || '').trim();
  if (!normalized || invalidValues.includes(normalized)) {
    return fallback;
  }
  return normalized;
}

const CANONICAL_SITE_URL = 'https://maneradancestudio.ru';

function resolveSiteUrl(value: string | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return CANONICAL_SITE_URL;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === 'manera.hyperconnect.fun' ||
      host === 'maneradancestudio.ru'
    ) {
      return CANONICAL_SITE_URL;
    }
    return normalized;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

function resolveRouteLink(value: string | undefined, fallback: string) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.includes('/maps/?text=')) {
    return fallback;
  }
  return normalized;
}

export const publicSiteConfig = {
  siteUrl: resolveSiteUrl(import.meta.env.VITE_SITE_URL),
  defaultSrc: resolveValue(import.meta.env.VITE_DEFAULT_SRC, 'qr-default'),
  whatsappLink: resolveValue(import.meta.env.VITE_WHATSAPP_LINK, 'https://wa.me/79996515671'),
  telegramLink: resolveValue(import.meta.env.VITE_TELEGRAM_LINK, 'https://t.me/manera_dancecompany', ['https://t.me/', 'https://t.me']),
  instagramLink: resolveValue(
    import.meta.env.VITE_INSTAGRAM_LINK,
    'https://www.instagram.com/manera__dance?igsh=MTA5OW5zZDd3MTRy&utm_source=qr',
  ),
  vkLink: resolveValue(import.meta.env.VITE_VK_LINK, 'https://vk.com/manera_dance'),
  routeLink: resolveRouteLink(import.meta.env.VITE_ROUTE_LINK, 'https://yandex.ru/maps/-/CPrBVWMZ'),
};
