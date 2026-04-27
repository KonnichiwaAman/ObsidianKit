import { GA4_MEASUREMENT_ID, SITE_URL } from "@/lib/siteConfig";
import { isAnalyticsConsentGranted } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __obsidianKitGaPromise?: Promise<void>;
  }
}

let analyticsInitialized = false;
let analyticsDisabled = false;

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") return false;

  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win = typeof window !== "undefined"
    ? (window as Window & { doNotTrack?: string })
    : undefined;

  const dntValue = nav.doNotTrack || nav.msDoNotTrack || win?.doNotTrack;
  return dntValue === "1" || dntValue === "yes";
}

function loadGaScript(measurementId: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  if (window.__obsidianKitGaPromise) {
    return window.__obsidianKitGaPromise;
  }

  window.__obsidianKitGaPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
    ) as HTMLScriptElement | null;

    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GA4 script."));
    document.head.appendChild(script);
  });

  return window.__obsidianKitGaPromise;
}

export function initAnalytics() {
  if (!GA4_MEASUREMENT_ID || analyticsInitialized || analyticsDisabled) return;
  if (typeof window === "undefined") return;
  if (!isAnalyticsConsentGranted()) return;

  if (isDoNotTrackEnabled()) {
    analyticsDisabled = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));

  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: false,
  });

  analyticsInitialized = true;

  void loadGaScript(GA4_MEASUREMENT_ID).catch(() => {
    analyticsDisabled = true;
  });
}

export function trackPageView(path: string, title?: string) {
  if (!GA4_MEASUREMENT_ID || analyticsDisabled) return;
  if (typeof window === "undefined") return;
  if (!isAnalyticsConsentGranted()) return;

  if (!analyticsInitialized) {
    initAnalytics();
  }

  if (!window.gtag) return;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const payload: Record<string, string> = {
    page_location: `${SITE_URL}${normalizedPath}`,
    page_path: normalizedPath,
    send_to: GA4_MEASUREMENT_ID,
  };

  if (title) {
    payload.page_title = title;
  }

  window.gtag("event", "page_view", payload);
}

export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {},
) {
  if (!GA4_MEASUREMENT_ID || analyticsDisabled) return;
  if (typeof window === "undefined") return;
  if (!isAnalyticsConsentGranted()) return;

  if (!analyticsInitialized) {
    initAnalytics();
  }

  window.gtag?.("event", eventName, params);
}
