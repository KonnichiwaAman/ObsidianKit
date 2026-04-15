import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="mobile-tap-feedback relative flex h-11 w-11 items-center justify-center rounded-lg
                 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                 text-[var(--color-text-secondary)] transition-colors duration-200
                 active:scale-[0.95] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]
                 cursor-pointer"
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
