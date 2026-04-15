import { useMemo, useState } from "react";
import { Regex } from "lucide-react";

interface MatchEntry {
  value: string;
  index: number;
  groups: string[];
}

function sanitizeFlags(flags: string) {
  const valid = flags.replace(/[^dgimsuvy]/g, "");
  return Array.from(new Set(valid.split(""))).join("");
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("gi");
  const [testText, setTestText] = useState("");

  const result = useMemo(() => {
    const safeFlags = sanitizeFlags(flags);

    if (!pattern) {
      return {
        safeFlags,
        error: null as string | null,
        matches: [] as MatchEntry[],
      };
    }

    try {
      const regex = new RegExp(pattern, safeFlags);
      const matches: MatchEntry[] = [];

      if (regex.global) {
        for (const match of testText.matchAll(regex)) {
          matches.push({
            value: match[0],
            index: match.index ?? 0,
            groups: match.slice(1),
          });
          if (matches.length >= 200) break;
        }
      } else {
        const single = regex.exec(testText);
        if (single) {
          matches.push({
            value: single[0],
            index: single.index,
            groups: single.slice(1),
          });
        }
      }

      return {
        safeFlags,
        error: null as string | null,
        matches,
      };
    } catch (regexError) {
      return {
        safeFlags,
        error: regexError instanceof Error ? regexError.message : "Invalid regex",
        matches: [] as MatchEntry[],
      };
    }
  }, [pattern, flags, testText]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="for example: (cat|dog)\\s+(\\w+)"
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Flags</label>
            <input
              type="text"
              value={flags}
              onChange={(event) => setFlags(event.target.value)}
              placeholder="gim"
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Using flags: {result.safeFlags || "none"}</p>
          </div>
        </div>

        {result.error && <p className="text-xs text-red-500">{result.error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Test Text</label>
          <textarea
            value={testText}
            onChange={(event) => setTestText(event.target.value)}
            rows={14}
            placeholder="Paste sample text here..."
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
          />
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <Regex className="h-4 w-4 text-[var(--color-text-secondary)]" />
              Matches: {result.matches.length}
            </p>
            {pattern && !result.error && result.matches.length === 0 && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">No matches found.</p>
            )}
          </div>

          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {result.matches.map((match, index) => (
              <div
                key={`${match.index}-${index}`}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-3"
              >
                <p className="text-xs text-[var(--color-text-muted)]">Match #{index + 1} at index {match.index}</p>
                <p className="mt-1 break-all rounded-md bg-[var(--color-bg-primary)] px-2 py-1 font-mono text-xs text-[var(--color-text-primary)]">
                  {match.value || "(empty match)"}
                </p>
                {match.groups.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {match.groups.map((group, groupIndex) => (
                      <p key={`${match.index}-${groupIndex}`} className="text-xs text-[var(--color-text-secondary)]">
                        Group {groupIndex + 1}: {group || "(empty)"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
