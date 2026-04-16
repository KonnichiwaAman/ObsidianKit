import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";

function defer(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  void Promise.resolve().then(callback);
}

export function useRouteTracking() {
  const location = useLocation();

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
    const path = `${location.pathname}${location.search}${location.hash}`;
    defer(() => {
      trackPageView(path, document.title);
    });
  }, [location.pathname, location.search, location.hash]);
}
