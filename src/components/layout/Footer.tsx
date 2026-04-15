export function Footer() {
  return (
    <footer className="safe-area-inset-bottom border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-7xl py-8 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[var(--color-text-muted)]">
            ObsidianKit — 100% client-side. No uploads. No tracking. Free forever.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Built with privacy in mind.
          </p>
        </div>
      </div>
    </footer>
  );
}
