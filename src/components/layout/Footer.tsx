import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="safe-area-inset-bottom border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-7xl py-8 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--color-text-muted)]">
            ObsidianKit is 100% client-side by design. Files stay on your device.
          </p>

          <nav className="flex items-center gap-4" aria-label="Footer links">
            <Link
              to="/tools"
              className="text-xs text-[var(--color-text-muted)] transition-colors md:hover:text-[var(--color-text-primary)]"
            >
              Tools
            </Link>
            <Link
              to="/blog"
              className="text-xs text-[var(--color-text-muted)] transition-colors md:hover:text-[var(--color-text-primary)]"
            >
              Blog
            </Link>
          </nav>
        </div>

        <p className="mt-5 text-[11px] text-[var(--color-text-muted)]">
          Copyright {currentYear} ObsidianKit. Built for private, fast productivity workflows.
        </p>
      </div>
    </footer>
  );
}
