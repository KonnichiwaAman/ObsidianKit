import { useState } from "react";
import { Copy, Check, Ruler, Scale } from "lucide-react";

type Category = "Underweight" | "Normal" | "Overweight" | "Obese";
type WeightUnit = "kg" | "lb";
type HeightUnit = "cm" | "ft-in";

interface BmiResult {
  bmi: number;
  category: Category;
}

const SCALE_MIN = 0;
const SCALE_MAX = 40;

const categories: { label: Category; range: string; color: string; min: number; max: number }[] = [
  { label: "Underweight", range: "< 18.5", color: "#f97316", min: 0, max: 18.5 },
  { label: "Normal", range: "18.5 – 24.9", color: "#34d399", min: 18.5, max: 25 },
  { label: "Overweight", range: "25 – 29.9", color: "#fbbf24", min: 25, max: 30 },
  { label: "Obese", range: "30+", color: "#f87171", min: 30, max: SCALE_MAX },
];

function getCategory(bmi: number): Category {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function getCategoryColor(cat: Category): string {
  return categories.find((c) => c.label === cat)?.color ?? "#737373";
}

function toWeightInKg(weight: number, unit: WeightUnit): number {
  if (unit === "kg") return weight;
  return weight * 0.45359237;
}

function toHeightInMeters(
  unit: HeightUnit,
  heightCm: string,
  heightFt: string,
  heightIn: string,
): number | null {
  if (unit === "cm") {
    const cm = parseFloat(heightCm);
    if (!Number.isFinite(cm) || cm <= 0) return null;
    return cm / 100;
  }

  const ft = parseFloat(heightFt) || 0;
  const inches = parseFloat(heightIn) || 0;
  const totalInches = ft * 12 + inches;
  if (!Number.isFinite(totalInches) || totalInches <= 0) return null;
  return totalInches * 0.0254;
}

export default function BmiCalculator() {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [result, setResult] = useState<BmiResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function calculate() {
    setError("");

    const rawWeight = parseFloat(weight);
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
      setResult(null);
      setError("Enter a valid weight greater than 0.");
      return;
    }

    const weightKg = toWeightInKg(rawWeight, weightUnit);
    const heightMeters = toHeightInMeters(heightUnit, heightCm, heightFt, heightIn);

    if (!heightMeters) {
      setResult(null);
      setError("Enter a valid height greater than 0.");
      return;
    }

    const rawBmi = weightKg / (heightMeters * heightMeters);
    if (!Number.isFinite(rawBmi) || rawBmi <= 0) {
      setResult(null);
      setError("Unable to calculate BMI with the current values.");
      return;
    }

    const roundedBmi = Number(rawBmi.toFixed(1));
    setResult({ bmi: roundedBmi, category: getCategory(roundedBmi) });
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(
      `BMI: ${result.bmi}\nCategory: ${result.category}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setWeight("");
    setHeightCm("");
    setHeightFt("");
    setHeightIn("");
    setResult(null);
    setError("");
  }

  // Marker uses the same linear scale as segment widths to avoid value-vs-bar mismatch.
  const markerPosition = result
    ? Math.min(Math.max(((result.bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100, 0), 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Independent Unit Toggles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-2">
          <div className="mb-2 flex items-center gap-2 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            <Scale className="h-3.5 w-3.5" />
            Weight Unit
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => {
                  setWeightUnit(u);
                  setResult(null);
                  setError("");
                }}
                className={`mobile-tap-feedback rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.985] ${
                  weightUnit === u
                    ? "border-[var(--color-border-hover)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                    : "border-transparent text-[var(--color-text-muted)] md:hover:border-[var(--color-border-primary)] md:hover:text-[var(--color-text-secondary)]"
                }`}
              >
                {u === "kg" ? "Kilograms (kg)" : "Pounds (lb)"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-2">
          <div className="mb-2 flex items-center gap-2 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            <Ruler className="h-3.5 w-3.5" />
            Height Unit
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1">
            {(["cm", "ft-in"] as const).map((u) => (
              <button
                key={u}
                onClick={() => {
                  setHeightUnit(u);
                  setResult(null);
                  setError("");
                }}
                className={`mobile-tap-feedback rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.985] ${
                  heightUnit === u
                    ? "border-[var(--color-border-hover)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                    : "border-transparent text-[var(--color-text-muted)] md:hover:border-[var(--color-border-primary)] md:hover:text-[var(--color-text-secondary)]"
                }`}
              >
                {u === "cm" ? "Centimeters (cm)" : "Feet + Inches"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Weight */}
        <div>
          <label htmlFor="bmi-weight" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            Weight ({weightUnit === "kg" ? "kg" : "lb"})
          </label>
          <input
            id="bmi-weight"
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={weightUnit === "kg" ? "e.g. 70" : "e.g. 154"}
            className="w-full rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-input)] px-4 py-3 text-sm
                       text-[var(--color-text-primary)] outline-none
                       placeholder:text-[var(--color-text-muted)]
                       focus:border-[var(--color-border-hover)]
                       transition-colors duration-200"
          />
        </div>

        {/* Height */}
        {heightUnit === "cm" ? (
          <div>
            <label htmlFor="bmi-height" className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Height (cm)
            </label>
            <input
              id="bmi-height"
              type="number"
              min="0"
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 175"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         placeholder:text-[var(--color-text-muted)]
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Height
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  id="bmi-height-ft"
                  type="number"
                  min="0"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  placeholder="ft"
                  className="w-full rounded-xl border border-[var(--color-border-primary)]
                             bg-[var(--color-bg-input)] px-4 py-3 text-sm
                             text-[var(--color-text-primary)] outline-none
                             placeholder:text-[var(--color-text-muted)]
                             focus:border-[var(--color-border-hover)]
                             transition-colors duration-200"
                />
              </div>
              <div className="flex-1">
                <input
                  id="bmi-height-in"
                  type="number"
                  min="0"
                  step="0.1"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="in"
                  className="w-full rounded-xl border border-[var(--color-border-primary)]
                             bg-[var(--color-bg-input)] px-4 py-3 text-sm
                             text-[var(--color-text-primary)] outline-none
                             placeholder:text-[var(--color-text-muted)]
                             focus:border-[var(--color-border-hover)]
                             transition-colors duration-200"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={calculate}
          className="mobile-tap-feedback rounded-lg bg-[var(--color-text-primary)] px-6 py-2.5 text-xs font-semibold
                     text-[var(--color-bg-primary)] transition-opacity duration-200 active:scale-[0.985] md:hover:opacity-90
                     cursor-pointer"
        >
          Calculate BMI
        </button>
        <button
          onClick={reset}
          className="mobile-tap-feedback rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 active:scale-[0.985] md:hover:border-[var(--color-border-hover)]
                     md:hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          Reset
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 px-3 py-2 text-xs text-[#fca5a5]">
          {error}
        </p>
      ) : null}

      {/* Result */}
      {result && (
        <div className="space-y-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
          {/* BMI Value */}
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: getCategoryColor(result.category) }}>
              {result.bmi}
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: getCategoryColor(result.category) }}>
              {result.category}
            </p>
          </div>

          {/* Visual Scale */}
          <div className="relative mt-4">
            <div className="flex h-3 overflow-hidden rounded-full">
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  className="h-full"
                  style={{
                    backgroundColor: cat.color,
                    width: `${((cat.max - cat.min) / (SCALE_MAX - SCALE_MIN)) * 100}%`,
                  }}
                />
              ))}
            </div>
            {markerPosition !== null && (
              <div
                className="absolute top-[-4px] h-5 w-1.5 rounded-full bg-[var(--color-text-primary)] border border-[var(--color-bg-primary)]"
                style={{ left: `${markerPosition}%`, transform: "translateX(-50%)" }}
              />
            )}
            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>0</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className={`rounded-lg px-3 py-2 text-center text-xs ${
                  result.category === cat.label
                    ? "border-2"
                    : "border border-[var(--color-border-primary)] opacity-50"
                }`}
                style={
                  result.category === cat.label
                    ? { borderColor: cat.color, backgroundColor: cat.color + "15" }
                    : {}
                }
              >
                <p className="font-medium text-[var(--color-text-primary)]">{cat.label}</p>
                <p className="text-[var(--color-text-muted)]">{cat.range}</p>
              </div>
            ))}
          </div>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="mobile-tap-feedback inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-primary)] px-4 py-2.5 text-xs font-medium
                       text-[var(--color-text-secondary)] transition-all duration-200
                       active:scale-[0.985] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]
                       cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Result"}
          </button>
        </div>
      )}
    </div>
  );
}
