import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { CONSENT_EVENT, isAnalyticsConsentGranted } from "@/lib/consent";

function defer(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  void Promise.resolve().then(callback);
}

export function useRouteTracking() {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (location.hash) return;

    defer(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    defer(() => {
      trackPageView(currentPath, document.title);
    });
  }, [currentPath]);

  useEffect(() => {
    const handleConsentUpdate = () => {
      if (!isAnalyticsConsentGranted()) return;

      defer(() => {
        initAnalytics();
        trackPageView(currentPath, document.title);
      });
    };

    window.addEventListener(CONSENT_EVENT, handleConsentUpdate as EventListener);
    return () => {
      window.removeEventListener(CONSENT_EVENT, handleConsentUpdate as EventListener);
    };
  }, [currentPath]);
}
