import {
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndexableRoutes } from "./route-manifest";

const FALLBACK_SITE_URL = "https://obsidiankit.me";

function normalizeBaseUrl(value: string | undefined): string {
  if (!value) return FALLBACK_SITE_URL;

  const trimmed = String(value).trim();
  if (!trimmed) return FALLBACK_SITE_URL;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getRoutePriority(route: string): string {
  if (route === "/") return "1.0";
  if (route === "/tools") return "0.95";
  if (route === "/blog") return "0.85";
  if (route.startsWith("/tool/")) return "0.9";
  if (route.startsWith("/category/")) return "0.82";
  if (route.startsWith("/blog/")) return "0.72";
  return "0.6";
}

function getRouteChangefreq(route: string): string {
  if (route === "/" || route === "/tools") return "weekly";
  if (route === "/blog" || route.startsWith("/blog/")) return "weekly";
  if (route.startsWith("/tool/") || route.startsWith("/category/")) return "monthly";
  return "monthly";
}

function buildSitemapXml(routes: string[], baseUrl: string, lastmod: string): string {
  const entries = routes
    .map((route) => {
      const url = new URL(route, baseUrl).toString();
      return [
        "  <url>",
        `    <loc>${escapeXml(url)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${getRouteChangefreq(route)}</changefreq>`,
        `    <priority>${getRoutePriority(route)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const publicDir = path.join(projectRoot, "public");

const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
const env = processEnv?.env ?? {};
const baseUrl = normalizeBaseUrl(env.SITE_URL || env.VITE_SITE_URL);
const host = new URL(baseUrl).host;
const today = toIsoDate(new Date());
const routes = buildIndexableRoutes();

const robotsTxt = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /404",
  `Host: ${host}`,
  `Sitemap: ${baseUrl}/sitemap.xml`,
  `# Generated: ${today}`,
  "",
].join("\n");

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
writeFileSync(path.join(publicDir, "sitemap.xml"), buildSitemapXml(routes, baseUrl, today), "utf8");

console.log(`Generated robots.txt and sitemap.xml for ${routes.length} routes at ${baseUrl}`);
