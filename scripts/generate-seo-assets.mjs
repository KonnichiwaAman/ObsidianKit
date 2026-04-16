import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
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

const robotsTxt = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /404",
  "Disallow: /sitemap.xml",
  `Host: ${host}`,
  `# Generated: ${today}`,
  "",
].join("\n");

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
rmSync(path.join(publicDir, "sitemap.xml"), { force: true });

console.log(`Generated SEO assets for ${allRoutes.length} routes at ${baseUrl}`);
