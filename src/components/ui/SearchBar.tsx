import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "@/hooks/useSearch";
import { cn, isSafeInternalPath } from "@/lib/utils";

interface SearchBarProps {
  variant?: "hero" | "navbar";
  placeholder?: string;
}

export function SearchBar({
  variant = "navbar",
  placeholder = "Search tools...",
}: SearchBarProps) {
  const { query, setQuery, results } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isHero = variant === "hero";
  const showDropdown = isFocused && query.trim().length > 0;
  const listboxId = isHero ? "hero-search-results" : "navbar-search-results";

  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  function openFirstResult() {
    if (results.length === 0) return;
    if (!isSafeInternalPath(results[0].path)) return;
    navigate(results[0].path);
    setQuery("");
    setIsFocused(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={cn(
          "searchbar-shell flex items-center gap-3 rounded-xl transition-colors duration-200",
          "bg-[var(--color-bg-input)]",
          isFocused && "bg-[var(--color-bg-card)]",
          isHero ? "px-5 py-4" : "px-3 py-2.5 sm:py-2",
        )}
      >
        <Search
          className={cn(
            "shrink-0 text-[var(--color-text-muted)]",
            isHero ? "h-5 w-5" : "h-4 w-4",
          )}
        />
        <input
          className={cn(
            "searchbar-input w-full bg-transparent outline-none placeholder:text-[var(--color-text-muted)]",
            "text-[var(--color-text-primary)]",
            isHero ? "text-base" : "text-sm",
          )}
          id={isHero ? "hero-search" : "navbar-search"}
          type="text"
          role="combobox"
          aria-label="Search ObsidianKit tools"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsFocused(false);
              return;
            }

            if (event.key === "Enter" && showDropdown) {
              event.preventDefault();
              openFirstResult();
            }
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="mobile-tap-feedback shrink-0 rounded-md p-1.5 text-[var(--color-text-muted)]
                       transition-colors cursor-pointer active:scale-[0.94] md:hover:text-[var(--color-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(60vh,20rem)] overflow-y-auto
                     rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]
                     shadow-2xl"
        >
          {results.length === 0 ? (
            <div role="status" className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
              No tools found for "{query}"
            </div>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Search results">
              {results.map((tool) => {
                const Icon = tool.icon;
                return (
                  <li key={tool.id}>
                    <button
                      role="option"
                      aria-label={`Open ${tool.name}`}
                      type="button"
                      onClick={() => {
                        if (!isSafeInternalPath(tool.path)) return;
                        navigate(tool.path);
                        setQuery("");
                        setIsFocused(false);
                      }}
                      className="mobile-tap-feedback flex min-h-11 w-full items-center gap-3 px-4 py-3
                                 text-left transition-colors duration-150
                                 cursor-pointer active:bg-[var(--color-bg-card-hover)] md:hover:bg-[var(--color-bg-card)]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {tool.name}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">
                          {tool.description}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
