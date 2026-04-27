const CACHE_VERSION = "obsidiankit-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

const REMOTE_CACHE_FIRST_HOSTS = new Set([
  "cdn.jsdelivr.net",
]);

function isCacheableResponse(response) {
  return response && (response.status === 200 || response.status === 0);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES)),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const activeCaches = new Set([APP_SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE]);

  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => !activeCaches.has(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  if (request.mode === "navigate") {
    return cache.match("/index.html");
  }

  return new Response("", { status: 504, statusText: "Gateway Timeout" });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === "navigate") {
      const fallback = await cache.match("/index.html");
      if (fallback) return fallback;
    }

    return new Response("", { status: 504, statusText: "Gateway Timeout" });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch {
    return new Response("", { status: 503, statusText: "Service Unavailable" });
  }
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs = 3000) {
  const cache = await caches.open(cacheName);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (isCacheableResponse(response)) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-Is-Stale-Cache', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: headers
      });
    }
    return new Response("", { status: 504, statusText: "Gateway Timeout" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    const isStaticAsset =
      url.pathname.startsWith("/assets/") ||
      request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "worker" ||
      request.destination === "font" ||
      request.destination === "image" ||
      request.destination === "manifest" ||
      url.pathname.endsWith(".wasm");

    if (isStaticAsset) {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
      return;
    }

    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (REMOTE_CACHE_FIRST_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (url.hostname === "open.er-api.com") {
    event.respondWith(networkFirstWithTimeout(request, RUNTIME_CACHE));
  }
});
