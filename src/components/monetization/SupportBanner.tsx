import { Coffee, HeartHandshake } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { SUPPORT_LINKS } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

interface SupportBannerProps {
  className?: string;
  compact?: boolean;
}

export function SupportBanner({ className, compact = false }: SupportBannerProps) {
  return (
    <section
      aria-label="Support ObsidianKit"
      className={cn(
        "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]",
        compact ? "p-4" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Keep ObsidianKit free and privacy-first
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            If these tools save you time, consider supporting development. Every contribution
            helps us ship faster and keep everything client-side.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={SUPPORT_LINKS.kofi}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => trackEvent("support_click", { provider: "kofi" })}
            className="mobile-tap-feedback inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors active:scale-[0.985] md:hover:border-[var(--color-border-hover)]"
          >
            <Coffee className="h-4 w-4" />
            Buy Me a Coffee
          </a>

          <a
            href={SUPPORT_LINKS.githubSponsors}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => trackEvent("support_click", { provider: "github_sponsors" })}
            className="mobile-tap-feedback inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors active:scale-[0.985] md:hover:border-[var(--color-border-hover)]"
          >
            <HeartHandshake className="h-4 w-4" />
            GitHub Sponsors
          </a>
        </div>
      </div>
    </section>
  );
}
