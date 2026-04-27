import { Link } from "react-router-dom";
import { BookOpen, Grid2x2, Wrench } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar() {
  return (
    <header
      className="safe-area-inset-top sticky top-0 z-40 border-b border-[var(--color-border-primary)]
                 bg-[var(--color-bg-primary)]/82 backdrop-blur-xl"
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center gap-3 pl-[max(1rem,var(--safe-area-left))]
                   pr-[max(1rem,var(--safe-area-right))] sm:pl-[max(1.5rem,var(--safe-area-left))]
                   sm:pr-[max(1.5rem,var(--safe-area-right))] lg:pl-[max(2rem,var(--safe-area-left))]
                   lg:pr-[max(2rem,var(--safe-area-right))]"
      >
        {/* Logo */}
        <Link
          to="/"
          id="site-logo"
          aria-label="Go to ObsidianKit home"
          className="mobile-tap-feedback flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-[var(--color-text-primary)]
                     transition-opacity duration-200 active:scale-[0.985] md:hover:opacity-80"
        >
          <Wrench className="h-5 w-5" />
          <span className="text-[15px] font-bold tracking-tight sm:text-base">ObsidianKit</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/tools"
            className="mobile-tap-feedback inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-card)] px-3.5 text-xs font-medium text-[var(--color-text-secondary)]
                       transition-all duration-200 active:scale-[0.985] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]"
          >
            <Grid2x2 className="h-3.5 w-3.5" />
            All Tools
          </Link>

          <Link
            to="/blog"
            className="mobile-tap-feedback inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-card)] px-3.5 text-xs font-medium text-[var(--color-text-secondary)]
                       transition-all duration-200 active:scale-[0.985] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </Link>
        </div>

        {/* Search */}
        <div className="mx-2 hidden max-w-md flex-1 sm:block">
          <SearchBar variant="navbar" />
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile search */}
      <div className="border-t border-[var(--color-border-primary)] px-4 py-2.5 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] sm:hidden">
        <SearchBar variant="navbar" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            to="/tools"
            className="mobile-tap-feedback inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-xs font-medium text-[var(--color-text-secondary)] active:scale-[0.985]"
          >
            <Grid2x2 className="h-3.5 w-3.5" />
            All Tools
          </Link>
          <Link
            to="/blog"
            className="mobile-tap-feedback inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-xs font-medium text-[var(--color-text-secondary)] active:scale-[0.985]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </Link>
        </div>
      </div>
    </header>
  );
}
