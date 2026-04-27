import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  CONSENT_EVENT,
  grantAllTrackingConsent,
  grantEssentialOnlyConsent,
  readTrackingConsent,
  type TrackingConsent,
} from "@/lib/consent";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { ADSENSE_ENABLED, GA4_MEASUREMENT_ID } from "@/lib/siteConfig";

const CONSENT_FEATURES_ENABLED = Boolean(GA4_MEASUREMENT_ID) || ADSENSE_ENABLED;

function defer(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  void Promise.resolve().then(callback);
}

export function ConsentBanner() {
  const location = useLocation();
  const [consent, setConsent] = useState<TrackingConsent>(() => readTrackingConsent());

  const currentPath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.pathname, location.search, location.hash],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncConsent = () => setConsent(readTrackingConsent());

    window.addEventListener("storage", syncConsent);
    window.addEventListener(CONSENT_EVENT, syncConsent as EventListener);

    return () => {
      window.removeEventListener("storage", syncConsent);
      window.removeEventListener(CONSENT_EVENT, syncConsent as EventListener);
    };
  }, []);

  if (!CONSENT_FEATURES_ENABLED || consent.decided) {
    return null;
  }

  function handleAcceptAll() {
    grantAllTrackingConsent();

    defer(() => {
      initAnalytics();
      trackPageView(currentPath, document.title);
    });
  }

  function handleEssentialOnly() {
    grantEssentialOnlyConsent();
  }

  return (
    <aside
      aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-[max(0.75rem,var(--safe-area-bottom))] z-[80] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-2xl sm:inset-x-6 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            <Shield className="h-3.5 w-3.5" />
            Privacy Controls
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Choose whether to enable optional analytics and ads. File processing stays local,
            but these features can contact third-party services.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="mobile-tap-feedback inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4 text-sm font-medium text-[var(--color-text-secondary)] transition-colors active:scale-[0.99] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="mobile-tap-feedback inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border-hover)] bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-bg-primary)] transition-opacity active:scale-[0.99] md:hover:opacity-90"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
