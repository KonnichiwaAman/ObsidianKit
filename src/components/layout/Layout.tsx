import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ConsentBanner } from "@/components/monetization/ConsentBanner";

export function Layout() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <a
        href="#main-content"
        className="sr-only absolute left-3 top-3 z-[70] rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:not-sr-only"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">
        <Outlet />
      </main>

      <Footer />
      <ConsentBanner />
    </div>
  );
}
