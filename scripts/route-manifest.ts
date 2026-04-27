import { publishedBlogPosts } from "../src/data/blogPosts";
import { categories } from "../src/data/categories";
import { tools } from "../src/data/tools";

const CORE_ROUTES = ["/", "/tools", "/blog", "/404"] as const;
const NON_INDEXABLE_ROUTES = new Set<string>(["/404"]);

export function buildPublicRoutes(): string[] {
  const routes = new Set<string>(CORE_ROUTES);

  for (const category of categories) {
    routes.add(category.path);
  }

  for (const tool of tools) {
    routes.add(tool.path);
  }

  for (const post of publishedBlogPosts) {
    routes.add(`/blog/${post.slug}`);
  }

  return Array.from(routes).sort((left, right) => left.localeCompare(right));
}

export function buildIndexableRoutes(): string[] {
  return buildPublicRoutes().filter((route) => !NON_INDEXABLE_ROUTES.has(route));
}
