import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

type Strength = "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";

function getStrength(password: string): { label: Strength; score: number; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 20) score++;

  if (score <= 1) return { label: "Very Weak", score: 1, color: "#f87171" };
  if (score === 2) return { label: "Weak", score: 2, color: "#fb923c" };
  if (score === 3) return { label: "Fair", score: 3, color: "#fbbf24" };
  if (score <= 5) return { label: "Strong", score: 4, color: "#34d399" };
  return { label: "Very Strong", score: 5, color: "#60a5fa" };
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const generate = useCallback((): string => {
    let chars = "";
    if (uppercase) chars += CHAR_SETS.uppercase;
    if (lowercase) chars += CHAR_SETS.lowercase;
    if (numbers) chars += CHAR_SETS.numbers;
    if (symbols) chars += CHAR_SETS.symbols;
    if (!chars) chars = CHAR_SETS.lowercase;

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (n) => chars[n % chars.length]).join("");
  }, [length, uppercase, lowercase, numbers, symbols]);

  const [password, setPassword] = useState(() => generate());

  function regenerate() {
    setPassword(generate());
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const strength = getStrength(password);

  const toggles = [
    { label: "Uppercase (A–Z)", checked: uppercase, set: setUppercase },
    { label: "Lowercase (a–z)", checked: lowercase, set: setLowercase },
    { label: "Numbers (0–9)", checked: numbers, set: setNumbers },
    { label: "Symbols (!@#$)", checked: symbols, set: setSymbols },
  ];

  return (
    <div className="space-y-6">
      {/* Generated password display */}
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center gap-3">
          <p
            className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-lg font-semibold
                       text-[var(--color-text-primary)] scrollbar-thin"
          >
            {password}
          </p>
          <button
            onClick={handleCopy}
            aria-label="Copy password"
            className="shrink-0 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2.5 text-[var(--color-text-secondary)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={regenerate}
            aria-label="Regenerate password"
            className="shrink-0 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2.5 text-[var(--color-text-secondary)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Strength meter */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">Strength</span>
            <span className="text-xs font-medium" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    i <= strength.score ? strength.color : "var(--color-border-primary)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Length slider */}
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center justify-between">
          <label htmlFor="pw-length" className="text-sm text-[var(--color-text-secondary)]">
            Password Length
          </label>
          <span className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {length}
          </span>
        </div>
        <input
          id="pw-length"
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => {
            setLength(Number(e.target.value));
            setCopied(false);
          }}
          onMouseUp={regenerate}
          onTouchEnd={regenerate}
          className="mt-3 w-full accent-[var(--color-text-primary)] cursor-pointer"
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>4</span>
          <span>64</span>
        </div>
      </div>

      {/* Character toggles */}
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <p className="mb-4 text-sm font-medium text-[var(--color-text-secondary)]">Character Types</p>
        <div className="space-y-3">
          {toggles.map((t) => (
            <label key={t.label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--color-text-primary)]">{t.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={t.checked}
                onClick={() => {
                  t.set(!t.checked);
                  // Defer regeneration to next tick so state is updated
                  setTimeout(regenerate, 0);
                }}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer ${
                  t.checked
                    ? "bg-[var(--color-text-primary)]"
                    : "bg-[var(--color-border-primary)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[var(--color-bg-primary)] transition-transform duration-200 ${
                    t.checked ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={regenerate}
        className="w-full rounded-lg bg-[var(--color-text-primary)] px-6 py-3 text-sm font-semibold
                   text-[var(--color-bg-primary)] transition-opacity duration-200 hover:opacity-90
                   cursor-pointer"
      >
        Generate New Password
      </button>
    </div>
  );
}
