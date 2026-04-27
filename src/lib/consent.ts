export interface TrackingConsent {
  decided: boolean;
  analytics: boolean;
  advertising: boolean;
}

const STORAGE_KEY = "obsidiankit-tracking-consent-v1";
export const CONSENT_EVENT = "obsidiankit:consent-updated";

const DEFAULT_CONSENT: TrackingConsent = {
  decided: false,
  analytics: false,
  advertising: false,
};

function isValidConsent(value: unknown): value is TrackingConsent {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<TrackingConsent>;
  return (
    typeof candidate.decided === "boolean" &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.advertising === "boolean"
  );
}

export function readTrackingConsent(): TrackingConsent {
  if (typeof window === "undefined") {
    return DEFAULT_CONSENT;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;

    const parsed = JSON.parse(raw) as unknown;
    if (isValidConsent(parsed)) {
      return parsed;
    }
  } catch {
    // Keep default consent state in restricted privacy contexts.
  }

  return DEFAULT_CONSENT;
}

export function writeTrackingConsent(consent: TrackingConsent): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Ignore persistence failures and continue with in-memory behavior.
  }

  window.dispatchEvent(new CustomEvent<TrackingConsent>(CONSENT_EVENT, { detail: consent }));
}

export function grantAllTrackingConsent(): void {
  writeTrackingConsent({
    decided: true,
    analytics: true,
    advertising: true,
  });
}

export function grantEssentialOnlyConsent(): void {
  writeTrackingConsent({
    decided: true,
    analytics: false,
    advertising: false,
  });
}

export function isAnalyticsConsentGranted(): boolean {
  const consent = readTrackingConsent();
  return consent.decided && consent.analytics;
}

export function isAdvertisingConsentGranted(): boolean {
  const consent = readTrackingConsent();
  return consent.decided && consent.advertising;
}
