import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_SITE_URL = "https://obsidiankit.com";

function normalizeBaseUrl(value) {
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

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function extractPaths(source, matcher, isAllowed) {
  const matches = [];

  for (const match of source.matchAll(matcher)) {
    const candidate = match[1]?.trim();
    if (!candidate) continue;
    if (!isAllowed(candidate)) continue;
    matches.push(candidate);
  }

  return matches;
}

const TOOL_DIRECTORY_IGNORE = new Set([
  "shared",
  "media-suite",
]);

function listToolRoutesFromDirectory(toolsDirectoryPath) {
  if (!existsSync(toolsDirectoryPath)) {
    return [];
  }

  const entries = readdirSync(toolsDirectoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directoryName) => !TOOL_DIRECTORY_IGNORE.has(directoryName))
    .map((directoryName) => `/tool/${directoryName}`);
}

function extractPublishedBlogSlugs(source) {
  const slugs = [];
  const entryPattern = /\{[\s\S]*?slug:\s*"([^"]+)"[\s\S]*?isPublished:\s*(true|false)[\s\S]*?\}/g;

  for (const match of source.matchAll(entryPattern)) {
    const slug = match[1];
    const isPublished = match[2] === "true";
    if (!slug || !isPublished) continue;
    slugs.push(`/blog/${slug}`);
  }

  return slugs;
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function routePriority(route) {
  if (route === "/") return "1.0";
  if (route.startsWith("/tool/")) return "0.9";
  if (route.startsWith("/category/")) return "0.8";
  if (route.startsWith("/blog/")) return "0.7";
  if (route === "/blog") return "0.6";
  return "0.5";
}

function routeChangeFrequency(route) {
  if (route === "/") return "daily";
  if (route.startsWith("/tool/")) return "weekly";
  if (route.startsWith("/category/")) return "weekly";
  if (route.startsWith("/blog")) return "weekly";
  return "monthly";
}

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const publicDir = path.join(projectRoot, "public");

const baseUrl = normalizeBaseUrl(process.env.SITE_URL || process.env.VITE_SITE_URL);
const host = new URL(baseUrl).host;
const today = toIsoDate(new Date());

const categoriesSource = readFileSync(
  path.join(projectRoot, "src", "data", "categories.ts"),
  "utf8",
);
const toolsDirectoryPath = path.join(projectRoot, "src", "tools");

const blogSourcePath = path.join(projectRoot, "src", "data", "blogPosts.ts");
const blogSource = existsSync(blogSourcePath) ? readFileSync(blogSourcePath, "utf8") : "";

const toolRoutes = listToolRoutesFromDirectory(toolsDirectoryPath);

const categoryRoutes = extractPaths(
  categoriesSource,
  /path:\s*"([^"]+)"/g,
  (value) => value.startsWith("/category/"),
);

const blogRoutes = extractPublishedBlogSlugs(blogSource);

const allRoutes = Array.from(
  new Set(["/", "/blog", ...categoryRoutes, ...toolRoutes, ...blogRoutes]),
).sort((a, b) => a.localeCompare(b));

const sitemapEntries = allRoutes
  .map((route) => {
    const location = `${baseUrl}${route}`;
    return [
      "  <url>",
      `    <loc>${xmlEscape(location)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${routeChangeFrequency(route)}</changefreq>`,
      `    <priority>${routePriority(route)}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  sitemapEntries,
  "</urlset>",
  "",
].join("\n");

const robotsTxt = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /404",
  `Host: ${host}`,
  `Sitemap: ${baseUrl}/sitemap.xml`,
  "",
].join("\n");

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");

console.log(`Generated SEO assets for ${allRoutes.length} routes at ${baseUrl}`);
