import { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const COMMON_PASSWORDS = [
  "password",
  "123456",
  "qwerty",
  "admin",
  "letmein",
  "welcome",
  "iloveyou",
  "monkey",
  "abc123",
  "dragon",
];

function getEntropyBits(length: number, poolSize: number) {
  if (length <= 0 || poolSize <= 0) return 0;
  return length * Math.log2(poolSize);
}

function estimateCrackTime(seconds: number) {
  if (seconds < 1) return "< 1 second";
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const year = 365 * day;

  if (seconds < minute) return `${Math.round(seconds)} seconds`;
  if (seconds < hour) return `${Math.round(seconds / minute)} minutes`;
  if (seconds < day) return `${Math.round(seconds / hour)} hours`;
  if (seconds < year) return `${Math.round(seconds / day)} days`;
  if (seconds < year * 1000) return `${Math.round(seconds / year)} years`;
  return `${(seconds / year).toExponential(2)} years`;
}

export default function PasswordStrength() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const analysis = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "No password",
        colorClass: "text-[var(--color-text-muted)]",
        entropyBits: 0,
        estimatedTime: "N/A",
        suggestions: ["Enter a password to evaluate strength."],
      };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    const hasRepeated = /(.)\1{2,}/.test(password);
    const hasSequence =
      /(?:0123|1234|2345|3456|4567|5678|6789)/.test(password) ||
      /(?:abcd|bcde|cdef|defg|qwer|asdf|zxcv)/i.test(password);

    let pool = 0;
    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasDigit) pool += 10;
    if (hasSymbol) pool += 33;

    const entropyBits = getEntropyBits(password.length, pool || 1);

    let score = 0;
    score += Math.min(45, password.length * 3);
    if (hasLower) score += 10;
    if (hasUpper) score += 10;
    if (hasDigit) score += 10;
    if (hasSymbol) score += 15;

    if (hasRepeated) score -= 10;
    if (hasSequence) score -= 12;

    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.some((word) => lower.includes(word))) {
      score -= 35;
    }

    score = Math.max(0, Math.min(100, score));

    let label = "Very Weak";
    let colorClass = "text-red-400";

    if (score >= 85) {
      label = "Excellent";
      colorClass = "text-emerald-400";
    } else if (score >= 70) {
      label = "Strong";
      colorClass = "text-green-400";
    } else if (score >= 50) {
      label = "Moderate";
      colorClass = "text-amber-300";
    } else if (score >= 30) {
      label = "Weak";
      colorClass = "text-orange-400";
    }

    const attemptsPerSecond = 1e10;
    const estimatedTime = estimateCrackTime(Math.pow(2, entropyBits) / attemptsPerSecond);

    const suggestions: string[] = [];
    if (password.length < 12) suggestions.push("Increase length to at least 12 characters.");
    if (!hasUpper || !hasLower) suggestions.push("Mix uppercase and lowercase letters.");
    if (!hasDigit) suggestions.push("Add numbers.");
    if (!hasSymbol) suggestions.push("Add symbols for more complexity.");
    if (hasRepeated) suggestions.push("Avoid repeated characters like aaa or 111.");
    if (hasSequence) suggestions.push("Avoid keyboard or number sequences.");
    if (COMMON_PASSWORDS.some((word) => lower.includes(word))) {
      suggestions.push("Avoid common words and leaked password patterns.");
    }
    if (suggestions.length === 0) suggestions.push("Password structure looks strong.");

    return {
      score,
      label,
      colorClass,
      entropyBits,
      estimatedTime,
      suggestions,
    };
  }, [password]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Password</label>
        <div className="flex items-center gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Type password to analyze"
            className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
          />
          <button
            onClick={() => setShowPassword((current) => !current)}
            className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Strength Score</p>
          <p className={`text-sm font-semibold ${analysis.colorClass}`}>{analysis.label}</p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-border-primary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-text-primary)] transition-all duration-300"
            style={{ width: `${analysis.score}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Score: {analysis.score}/100</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Entropy</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.entropyBits.toFixed(1)} bits</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Offline Crack Estimate</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.estimatedTime}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="inline-flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--color-text-secondary)]" />
          Improvement Suggestions
        </div>
        <div className="space-y-2">
          {analysis.suggestions.map((suggestion) => (
            <p
              key={suggestion}
              className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
            >
              {suggestion}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
