import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

const HomePage = lazy(async () => {
  const module = await import("@/pages/HomePage");
  return { default: module.HomePage };
});

const CategoryPage = lazy(async () => {
  const module = await import("@/pages/CategoryPage");
  return { default: module.CategoryPage };
});

const ToolPage = lazy(async () => {
  const module = await import("@/pages/ToolPage");
  return { default: module.ToolPage };
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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/tool/:toolId" element={<ToolPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
