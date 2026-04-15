import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Mode = "basic" | "increase" | "difference";

interface CalcResult {
  label: string;
  value: string;
}

export default function PercentageCalculator() {
  const [mode, setMode] = useState<Mode>("basic");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [copied, setCopied] = useState(false);

  function calculate() {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) return;

    let res: CalcResult;

    switch (mode) {
      case "basic":
        // What is A% of B?
        res = {
          label: `${a}% of ${b}`,
          value: parseFloat(((numA / 100) * numB).toFixed(6)).toString(),
        };
        break;
      case "increase":
        // Percentage change from A to B
        if (numA === 0) return;
        {
          const change = ((numB - numA) / Math.abs(numA)) * 100;
          const direction = change >= 0 ? "increase" : "decrease";
          res = {
            label: `${direction} from ${a} to ${b}`,
            value: `${parseFloat(Math.abs(change).toFixed(2))}% ${direction}`,
          };
        }
        break;
      case "difference":
        // A is what percent of B?
        if (numB === 0) return;
        res = {
          label: `${a} is what % of ${b}`,
          value: `${parseFloat(((numA / numB) * 100).toFixed(4))}%`,
        };
        break;
    }

    setResult(res!);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(`${result.label} = ${result.value}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setA("");
    setB("");
    setResult(null);
  }

  const modes: { key: Mode; label: string; inputA: string; inputB: string; description: string }[] = [
    {
      key: "basic",
      label: "Basic",
      inputA: "Percentage (%)",
      inputB: "Of Number",
      description: "What is X% of Y?",
    },
    {
      key: "increase",
      label: "Change",
      inputA: "From",
      inputB: "To",
      description: "Percentage change from X to Y",
    },
    {
      key: "difference",
      label: "Ratio",
      inputA: "Number",
      inputB: "Total",
      description: "X is what % of Y?",
    },
  ];

  const currentMode = modes.find((m) => m.key === mode)!;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult(null); }}
            className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
              mode === m.key
                ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--color-text-muted)]">{currentMode.description}</p>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pct-a" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            {currentMode.inputA}
          </label>
          <input
            id="pct-a"
            type="number"
            step="any"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="Enter value"
            className="w-full rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-input)] px-4 py-3 text-sm
                       text-[var(--color-text-primary)] outline-none
                       placeholder:text-[var(--color-text-muted)]
                       focus:border-[var(--color-border-hover)]
                       transition-colors duration-200"
          />
        </div>
        <div>
          <label htmlFor="pct-b" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            {currentMode.inputB}
          </label>
          <input
            id="pct-b"
            type="number"
            step="any"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="Enter value"
            className="w-full rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-input)] px-4 py-3 text-sm
                       text-[var(--color-text-primary)] outline-none
                       placeholder:text-[var(--color-text-muted)]
                       focus:border-[var(--color-border-hover)]
                       transition-colors duration-200"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={calculate}
          className="rounded-lg bg-[var(--color-text-primary)] px-6 py-2.5 text-xs font-semibold
                     text-[var(--color-bg-primary)] transition-opacity duration-200 hover:opacity-90
                     cursor-pointer"
        >
          Calculate
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">{result.label}</p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
              {result.value}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2.5 text-[var(--color-text-muted)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Quick reference */}
      {mode === "basic" && a && b && !isNaN(parseFloat(a)) && !isNaN(parseFloat(b)) && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">
            Quick Reference for {b}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[5, 10, 15, 20, 25, 50, 75, 100].map((pct) => {
              const val = parseFloat(((pct / 100) * parseFloat(b)).toFixed(4));
              return (
                <div
                  key={pct}
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-center"
                >
                  <p className="text-xs text-[var(--color-text-muted)]">{pct}%</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
                    {val}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
