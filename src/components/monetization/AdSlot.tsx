import { useEffect, useMemo, useRef, useState } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED, ADSENSE_SLOT_INLINE } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __obsidianKitAdsPromise?: Promise<void>;
  }
}

interface AdSlotProps {
  slot?: string;
  className?: string;
}

function loadAdSenseScript(client: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  if (window.__obsidianKitAdsPromise) {
    return window.__obsidianKitAdsPromise;
  }

  window.__obsidianKitAdsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}"]`,
    ) as HTMLScriptElement | null;

    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AdSense script."));

    document.head.appendChild(script);
  });

  return window.__obsidianKitAdsPromise;
}

export function AdSlot({ slot, className }: AdSlotProps) {
  const resolvedSlot = useMemo(() => slot?.trim() || ADSENSE_SLOT_INLINE, [slot]);
  const adRef = useRef<HTMLModElement | null>(null);
  const hasRequestedAdRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ADSENSE_ENABLED || !resolvedSlot) return;

    let active = true;

    void loadAdSenseScript(ADSENSE_CLIENT)
      .then(() => {
        if (!active || hasRequestedAdRef.current || !adRef.current) return;

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          hasRequestedAdRef.current = true;
        } catch {
          setLoadError("Ad is temporarily unavailable. Please try again later.");
        }
      })
      .catch(() => {
        if (active) {
          setLoadError("Ad is temporarily unavailable. Please try again later.");
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedSlot]);

  if (!ADSENSE_ENABLED || !resolvedSlot) {
    return (
      <aside
        aria-label="Advertisement"
        className={cn(
          "rounded-2xl border border-dashed border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5",
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Advertisement
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Monetization slot ready. Add your AdSense client and slot IDs in environment
          variables to serve ads.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Advertisement"
      className={cn(
        "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5",
        className,
      )}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Advertisement
      </p>

      <div className="rounded-xl bg-[var(--color-bg-primary)] p-2">
        <ins
          ref={adRef}
          className="adsbygoogle block min-h-[120px] w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={resolvedSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>

      {loadError ? (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{loadError}</p>
      ) : null}
    </aside>
  );
}
