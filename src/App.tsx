import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useRouteTracking } from "@/hooks/useRouteTracking";

const HomePage = lazy(async () => {
  const module = await import("@/pages/HomePage");
  return { default: module.HomePage };
});

const CategoryPage = lazy(async () => {
  const module = await import("@/pages/CategoryPage");
  return { default: module.CategoryPage };
});

const ToolsPage = lazy(async () => {
  const module = await import("@/pages/ToolsPage");
  return { default: module.ToolsPage };
});

const ToolPage = lazy(async () => {
  const module = await import("@/pages/ToolPage");
  return { default: module.ToolPage };
});

const BlogPage = lazy(async () => {
  const module = await import("@/pages/BlogPage");
  return { default: module.BlogPage };
});

const BlogPostPage = lazy(async () => {
  const module = await import("@/pages/BlogPostPage");
  return { default: module.BlogPostPage };
});

const NotFoundPage = lazy(async () => {
  const module = await import("@/pages/NotFoundPage");
  return { default: module.NotFoundPage };
});

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border-primary)]
                   border-t-[var(--color-text-secondary)]"
      />
    </div>
  );
}

function AppRoutes() {
  useRouteTracking();

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/tool/:toolId" element={<ToolPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
