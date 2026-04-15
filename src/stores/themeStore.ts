import { create } from "zustand";
import type { Theme } from "@/types";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem("obsidiankit-theme") as Theme | null;
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted privacy contexts.
  }

  return null;
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem("obsidiankit-theme", theme);
  } catch {
    // Ignore storage write failures to keep UI functional.
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = readStoredTheme();
  if (stored) return stored;

  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }

  persistTheme(theme);
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        return { theme: next };
      }),
    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
  };
});
