import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";

type Unit = "kg" | "g" | "mg" | "lbs" | "oz" | "t";

const units: { id: Unit; label: string; ratio: number }[] = [
  { id: "kg", label: "Kilograms (kg)", ratio: 1 },
  { id: "g", label: "Grams (g)", ratio: 1000 },
  { id: "mg", label: "Milligrams (mg)", ratio: 1e6 },
  { id: "lbs", label: "Pounds (lbs)", ratio: 2.20462 },
  { id: "oz", label: "Ounces (oz)", ratio: 35.274 },
  { id: "t", label: "Metric Tons (t)", ratio: 0.001 },
];

export default function WeightConverter() {
  const [amount, setAmount] = useState<string>("1");
  const [fromUnit, setFromUnit] = useState<Unit>("kg");
  const [toUnit, setToUnit] = useState<Unit>("lbs");

  const fromRatio = units.find((u) => u.id === fromUnit)?.ratio || 1;
  const toRatio = units.find((u) => u.id === toUnit)?.ratio || 1;

  // Convert everything to a base of Kilograms first
  const baseValue = parseFloat(amount) ? parseFloat(amount) / fromRatio : 0;
  const result = baseValue * toRatio;

  // Format the result to avoid long decimals
  const formattedResult =
    result === 0
      ? "0"
      : result % 1 !== 0
      ? parseFloat(result.toPrecision(7)).toString() // Truncate cleanly
      : result.toString();

  function handleSwap() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setAmount(formattedResult);
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr]">
        {/* From */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            From
          </label>
          <div className="flex flex-col gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-lg font-medium
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value as Unit)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-card)] px-4 py-3 text-sm font-medium
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            >
              {units.map((u) => (
                <option key={`from-${u.id}`} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex items-center justify-center pt-8">
          <button
            onClick={handleSwap}
            className="flex h-12 w-12 items-center justify-center rounded-full
                       border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                       text-[var(--color-text-muted)] transition-all duration-200
                       hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            <ArrowRightLeft className="h-5 w-5" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            To
          </label>
          <div className="flex flex-col gap-3">
            <div
              className="flex w-full items-center truncate rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-card)] px-4 py-3 text-lg font-semibold
                         text-[var(--color-text-primary)] shadow-inner"
            >
              {formattedResult}
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value as Unit)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-card)] px-4 py-3 text-sm font-medium
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            >
              {units.map((u) => (
                <option key={`to-${u.id}`} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick reference table */}
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Quick Conversions
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="flex flex-col space-y-1">
            <span className="text-[var(--color-text-secondary)]">1 kg</span>
            <span className="font-medium text-[var(--color-text-primary)]">2.2046 lbs</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[var(--color-text-secondary)]">1 lb</span>
            <span className="font-medium text-[var(--color-text-primary)]">0.4536 kg</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[var(--color-text-secondary)]">1 oz</span>
            <span className="font-medium text-[var(--color-text-primary)]">28.3495 g</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[var(--color-text-secondary)]">1 t</span>
            <span className="font-medium text-[var(--color-text-primary)]">1000 kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
