import { publicSiteConfig } from '../lib/publicSiteConfig';

function getDesktopGateQrCodeUrl(target: string) {
  const encodedTarget = encodeURIComponent(target);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodedTarget}`;
}

interface MobileOnlyGateProps {
  targetUrl?: string;
  title?: string;
  description?: string;
}

export function MobileOnlyGate({
  targetUrl = publicSiteConfig.siteUrl,
  title = 'Откройте сайт на мобильном телефоне',
  description = 'Раздел доступен только в мобильной версии. Отсканируйте QR-код камерой телефона.',
}: MobileOnlyGateProps) {
  const qrCodeUrl = getDesktopGateQrCodeUrl(targetUrl);

  return (
    <section className="desktop-gate" aria-label="Открыть на мобильном телефоне">
      <div className="desktop-gate-shell">
        <div className="desktop-gate-logo-shell">
          <img src="/manera-logo.png" alt="Манера" width={96} height={96} className="desktop-gate-logo" />
        </div>

        <h1 className="desktop-gate-title">{title}</h1>
        <p className="desktop-gate-description">{description}</p>

        <div className="desktop-gate-qr-wrap">
          <img
            src={qrCodeUrl}
            alt={`QR-код для перехода на ${targetUrl}`}
            width={200}
            height={200}
            loading="eager"
            decoding="async"
            className="desktop-gate-qr"
          />
        </div>

        <a href={targetUrl} className="desktop-gate-link">
          {targetUrl}
        </a>
      </div>
    </section>
  );
}
