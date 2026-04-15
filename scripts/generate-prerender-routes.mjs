import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIRECTORY_IGNORE = new Set([
  "shared",
  "media-suite",
]);

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

function listToolRoutesFromDirectory(toolsDirectoryPath) {
  if (!existsSync(toolsDirectoryPath)) return [];

  return readdirSync(toolsDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directoryName) => !TOOL_DIRECTORY_IGNORE.has(directoryName))
    .map((directoryName) => `/tool/${directoryName}`);
}

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");

const categoriesSource = readFileSync(
  path.join(projectRoot, "src", "data", "categories.ts"),
  "utf8",
);
const categories = extractPaths(
  categoriesSource,
  /path:\s*"([^"]+)"/g,
  (value) => value.startsWith("/category/"),
);

const tools = listToolRoutesFromDirectory(path.join(projectRoot, "src", "tools"));

const blogSourcePath = path.join(projectRoot, "src", "data", "blogPosts.ts");
const blogSource = existsSync(blogSourcePath) ? readFileSync(blogSourcePath, "utf8") : "";
const blogRoutes = extractPublishedBlogSlugs(blogSource);

const routes = Array.from(new Set(["/", "/blog", ...categories, ...tools, ...blogRoutes])).sort(
  (a, b) => a.localeCompare(b),
);

const outputPath = path.join(projectRoot, "public", "prerender-routes.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");

console.log(`Generated prerender route manifest with ${routes.length} routes.`);
