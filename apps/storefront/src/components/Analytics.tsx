'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, readConsent } from './ConsentBanner';

/**
 * Analytics + error monitoring — injected only when configured via NEXT_PUBLIC_* env.
 *
 * Privacy-first defaults: pick exactly one product analytics tool (Plausible, PostHog, or umami)
 * by setting its env. Sentry browser monitoring loads via its CDN loader when its DSN is set.
 * Renders nothing when none are configured, so it is a clean no-op out of the box.
 *
 * Consent gate (GDPR): when NEXT_PUBLIC_CONSENT_REQUIRED is not 'false' (the default), NO analytics
 * script renders until the visitor accepts via ConsentBanner. We re-read consent on mount and on the
 * `lumera:consent` event so acceptance takes effect without a reload. Set the flag to 'false' only
 * for regions/deployments where consent is handled elsewhere.
 *
 * All scripts use next/script with afterInteractive so they never block first paint.
 */
export function Analytics() {
  const consentRequired = process.env.NEXT_PUBLIC_CONSENT_REQUIRED !== 'false';
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (!consentRequired) {
      setConsented(true);
      return;
    }
    const sync = () => setConsented(readConsent() === 'accepted');
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, [consentRequired]);

  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  const usePlausible = !!plausibleDomain;
  const usePostHog = !usePlausible && !!posthogKey;
  const useUmami = !usePlausible && !usePostHog && !!umamiId && !!umamiSrc;

  if (!usePlausible && !usePostHog && !useUmami && !sentryDsn) return null;

  // Hold all scripts until the visitor has consented (unless consent is disabled by env).
  if (!consented) return null;

  return (
    <>
      {usePlausible && (
        <Script
          id="plausible"
          strategy="afterInteractive"
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
        />
      )}

      {usePostHog && (
        <Script id="posthog" strategy="afterInteractive">
          {`
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init(${JSON.stringify(posthogKey)},{api_host:${JSON.stringify(posthogHost)}});
          `}
        </Script>
      )}

      {useUmami && (
        <Script id="umami" strategy="afterInteractive" data-website-id={umamiId} src={umamiSrc as string} />
      )}

      {sentryDsn && (
        <Script
          id="sentry"
          strategy="afterInteractive"
          src="https://js.sentry-cdn.com/loader.js"
          data-lazy="no"
          onLoad={() => {
            const w = window as unknown as { Sentry?: { onLoad: (cb: () => void) => void; init: (o: Record<string, unknown>) => void } };
            w.Sentry?.onLoad(() => {
              w.Sentry?.init({ dsn: sentryDsn });
            });
          }}
        />
      )}
    </>
  );
}
