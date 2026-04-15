import { useState, useMemo } from "react";
import { ArrowLeftRight, Copy, Check } from "lucide-react";

interface UnitDef {
  label: string;
  toMeters: number; // 1 unit = X meters
}

const units: UnitDef[] = [
  { label: "Millimeter (mm)", toMeters: 0.001 },
  { label: "Centimeter (cm)", toMeters: 0.01 },
  { label: "Meter (m)", toMeters: 1 },
  { label: "Kilometer (km)", toMeters: 1000 },
  { label: "Inch (in)", toMeters: 0.0254 },
  { label: "Foot (ft)", toMeters: 0.3048 },
  { label: "Yard (yd)", toMeters: 0.9144 },
  { label: "Mile (mi)", toMeters: 1609.344 },
  { label: "Nautical Mile (nmi)", toMeters: 1852 },
];

export default function LengthConverter() {
  const [fromIdx, setFromIdx] = useState(4); // Inch
  const [toIdx, setToIdx] = useState(1); // Centimeter
  const [value, setValue] = useState("1");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return "";
    const meters = v * units[fromIdx].toMeters;
    const converted = meters / units[toIdx].toMeters;
    // Smart formatting: up to 6 decimal places, trim trailing zeros
    return parseFloat(converted.toFixed(6)).toString();
  }, [value, fromIdx, toIdx]);

  function swap() {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(
      `${value} ${units[fromIdx].label} = ${result} ${units[toIdx].label}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Quick conversion table for the selected "from" unit
  const quickTable = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v) || v === 0) return [];
    return units
      .filter((_, i) => i !== fromIdx)
      .map((u) => {
        const meters = v * units[fromIdx].toMeters;
        const converted = meters / u.toMeters;
        return { label: u.label, value: parseFloat(converted.toFixed(6)).toString() };
      });
  }, [value, fromIdx]);

  return (
    <div className="space-y-6">
      {/* Converter card */}
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-5">
        {/* From */}
        <div>
          <label htmlFor="length-from-unit" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            From
          </label>
          <div className="flex gap-3">
            <select
              id="length-from-unit"
              value={fromIdx}
              onChange={(e) => setFromIdx(Number(e.target.value))}
              className="flex-1 rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200 cursor-pointer"
            >
              {units.map((u, i) => (
                <option key={u.label} value={i}>{u.label}</option>
              ))}
            </select>
            <input
              id="length-from-value"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value"
              className="w-36 rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm text-right
                         text-[var(--color-text-primary)] outline-none
                         placeholder:text-[var(--color-text-muted)]
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={swap}
            aria-label="Swap units"
            className="rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2.5 text-[var(--color-text-muted)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <div>
          <label htmlFor="length-to-unit" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            To
          </label>
          <div className="flex gap-3">
            <select
              id="length-to-unit"
              value={toIdx}
              onChange={(e) => setToIdx(Number(e.target.value))}
              className="flex-1 rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200 cursor-pointer"
            >
              {units.map((u, i) => (
                <option key={u.label} value={i}>{u.label}</option>
              ))}
            </select>
            <div className="w-36 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-right">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {result || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula */}
      {result && value && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-5 py-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {value} {units[fromIdx].label.split(" (")[0]} ={" "}
            <span className="font-semibold text-[var(--color-text-primary)]">{result}</span>{" "}
            {units[toIdx].label.split(" (")[0]}
          </p>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]
                       p-2 text-[var(--color-text-muted)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Quick conversion table */}
      {quickTable.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">
            All conversions for {value} {units[fromIdx].label.split(" (")[0]}
          </p>
          <div className="space-y-2">
            {quickTable.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)]
                           bg-[var(--color-bg-primary)] px-4 py-2.5"
              >
                <span className="text-xs text-[var(--color-text-secondary)]">{row.label}</span>
                <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
