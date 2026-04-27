import { publishedBlogPosts } from "../src/data/blogPosts";
import { categories } from "../src/data/categories";
import { tools } from "../src/data/tools";
import toolRegistry from "../src/tools";
import { buildPublicRoutes } from "./route-manifest";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return Array.from(duplicates).sort((left, right) => left.localeCompare(right));
}

function validateToolRegistry(): void {
  const toolIds = new Set(tools.map((tool) => tool.id));
  const registryIds = new Set(Object.keys(toolRegistry));

  const unregistered = tools
    .map((tool) => tool.id)
    .filter((toolId) => !registryIds.has(toolId));
  const orphanedRegistryEntries = Object.keys(toolRegistry).filter((toolId) => !toolIds.has(toolId));

  assert(unregistered.length === 0, `Unregistered tool IDs: ${unregistered.join(", ")}`);
  assert(
    orphanedRegistryEntries.length === 0,
    `Orphaned registry IDs: ${orphanedRegistryEntries.join(", ")}`,
  );
}

function validateToolData(): void {
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const unknownCategoryIds = tools
    .map((tool) => tool.categoryId)
    .filter((categoryId) => !validCategoryIds.has(categoryId));

  const duplicateToolIds = findDuplicates(tools.map((tool) => tool.id));
  const duplicateToolPaths = findDuplicates(tools.map((tool) => tool.path));

  assert(unknownCategoryIds.length === 0, `Unknown category IDs in tools: ${unknownCategoryIds.join(", ")}`);
  assert(duplicateToolIds.length === 0, `Duplicate tool IDs: ${duplicateToolIds.join(", ")}`);
  assert(duplicateToolPaths.length === 0, `Duplicate tool paths: ${duplicateToolPaths.join(", ")}`);

  for (const category of categories) {
    const actualCount = tools.filter((tool) => tool.categoryId === category.id).length;
    assert(
      category.toolCount === actualCount,
      `Category ${category.id} reports ${category.toolCount} tools but has ${actualCount}`,
    );
  }
}

function validateBlogData(): void {
  const duplicateBlogSlugs = findDuplicates(publishedBlogPosts.map((post) => post.slug));
  assert(duplicateBlogSlugs.length === 0, `Duplicate blog slugs: ${duplicateBlogSlugs.join(", ")}`);
}

function validateRouteManifest(): void {
  const routes = buildPublicRoutes();
  const routeSet = new Set(routes);

  assert(routeSet.has("/"), "Route manifest is missing /");
  assert(routeSet.has("/tools"), "Route manifest is missing /tools");
  assert(routeSet.has("/blog"), "Route manifest is missing /blog");
  assert(routeSet.has("/404"), "Route manifest is missing /404");

  for (const category of categories) {
    assert(routeSet.has(category.path), `Route manifest missing category route ${category.path}`);
  }

  for (const tool of tools) {
    assert(routeSet.has(tool.path), `Route manifest missing tool route ${tool.path}`);
  }

  for (const post of publishedBlogPosts) {
    const blogRoute = `/blog/${post.slug}`;
    assert(routeSet.has(blogRoute), `Route manifest missing blog route ${blogRoute}`);
  }
}

validateToolRegistry();
validateToolData();
validateBlogData();
validateRouteManifest();

console.log("Integrity checks passed.");
