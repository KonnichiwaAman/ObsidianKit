import { useMemo, useState } from "react";
import { ArrowLeftRight, Copy, Check } from "lucide-react";

export interface LinearUnitDefinition {
  id: string;
  label: string;
  symbol: string;
  toBase: number;
}

interface LinearUnitConverterProps {
  units: LinearUnitDefinition[];
  defaultFrom: string;
  defaultTo: string;
  valuePlaceholder?: string;
  quickTableTitle?: string;
  footerNote?: string;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "Invalid";
  if (value === 0) return "0";

  const abs = Math.abs(value);
  if (abs >= 1e9 || abs < 1e-6) {
    return value
      .toExponential(8)
      .replace(/0+e/, "e")
      .replace(/\.e/, "e");
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 10,
  });
}

function getUnitById(units: LinearUnitDefinition[], id: string) {
  return units.find((unit) => unit.id === id) ?? units[0];
}

export function LinearUnitConverter({
  units,
  defaultFrom,
  defaultTo,
  valuePlaceholder = "Enter value",
  quickTableTitle = "Equivalent values",
  footerNote,
}: LinearUnitConverterProps) {
  const [fromUnitId, setFromUnitId] = useState(defaultFrom);
  const [toUnitId, setToUnitId] = useState(defaultTo);
  const [amount, setAmount] = useState("1");
  const [copied, setCopied] = useState(false);

  const fromUnit = getUnitById(units, fromUnitId);
  const toUnit = getUnitById(units, toUnitId);

  const parsedAmount = Number.parseFloat(amount);
  const hasValidAmount = Number.isFinite(parsedAmount);

  const result = useMemo(() => {
    if (!hasValidAmount) return "";
    const inBase = parsedAmount * fromUnit.toBase;
    return formatNumber(inBase / toUnit.toBase);
  }, [parsedAmount, fromUnit, toUnit, hasValidAmount]);

  const allConversions = useMemo(() => {
    if (!hasValidAmount) return [] as Array<{ id: string; label: string; value: string; symbol: string }>;

    const inBase = parsedAmount * fromUnit.toBase;
    return units
      .filter((unit) => unit.id !== fromUnit.id)
      .map((unit) => ({
        id: unit.id,
        label: unit.label,
        symbol: unit.symbol,
        value: formatNumber(inBase / unit.toBase),
      }));
  }, [hasValidAmount, parsedAmount, fromUnit, units]);

  function handleSwap() {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
  }

  async function handleCopy() {
    if (!result || !hasValidAmount) return;
    const sentence = `${formatNumber(parsedAmount)} ${fromUnit.symbol} = ${result} ${toUnit.symbol}`;
    await navigator.clipboard.writeText(sentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">From</label>
            <select
              value={fromUnitId}
              onChange={(event) => setFromUnitId(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={valuePlaceholder}
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         placeholder:text-[var(--color-text-muted)]
                         focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div className="flex items-center justify-center pt-7 sm:pt-0">
            <button
              onClick={handleSwap}
              className="rounded-full border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-primary)] p-2.5 text-[var(--color-text-secondary)]
                         transition-colors hover:border-[var(--color-border-hover)]
                         hover:text-[var(--color-text-primary)]"
              aria-label="Swap units"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">To</label>
            <select
              value={toUnitId}
              onChange={(event) => setToUnitId(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
            <div
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3"
            >
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {result || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {result && hasValidAmount && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-5 py-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatNumber(parsedAmount)} {fromUnit.symbol} ={" "}
            <span className="font-semibold text-[var(--color-text-primary)]">{result}</span> {toUnit.symbol}
          </p>
          <button
            onClick={handleCopy}
            className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2 text-[var(--color-text-secondary)] transition-colors
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="Copy conversion"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {allConversions.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">{quickTableTitle}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allConversions.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)]
                           bg-[var(--color-bg-primary)] px-3 py-2"
              >
                <span className="text-xs text-[var(--color-text-secondary)]">{row.label}</span>
                <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                  {row.value} {row.symbol}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {footerNote && (
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{footerNote}</p>
        </div>
      )}
    </div>
  );
}

export default LinearUnitConverter;
