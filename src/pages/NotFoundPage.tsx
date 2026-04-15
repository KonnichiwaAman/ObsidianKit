import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";
import { buildNotFoundSeo } from "@/lib/seo";

export function NotFoundPage() {
  const seoMetadata = buildNotFoundSeo("/404");

  return (
    <>
      <SeoHead metadata={seoMetadata} />

      <div className="mx-auto max-w-7xl px-4 py-32 text-center sm:px-6 lg:px-8">
        <p className="text-6xl font-bold text-[var(--color-text-muted)]">404</p>
        <h1 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mobile-tap-feedback mt-8 inline-flex items-center gap-2 rounded-lg border
                   border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                   px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]
                   transition-colors duration-200 active:scale-[0.99]
                   md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </>
  );
}
