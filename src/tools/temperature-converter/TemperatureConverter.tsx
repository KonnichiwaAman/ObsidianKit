import { useState } from "react";


export default function TemperatureConverter() {
  const [celsius, setCelsius] = useState("");
  const [fahrenheit, setFahrenheit] = useState("");
  const [kelvin, setKelvin] = useState("");

  function round(val: number) {
    return Math.round(val * 100) / 100;
  }

  function handleCelsiusChange(val: string) {
    setCelsius(val);
    if (val === "") {
      setFahrenheit("");
      setKelvin("");
      return;
    }
    const c = parseFloat(val);
    setFahrenheit(round((c * 9) / 5 + 32).toString());
    setKelvin(round(c + 273.15).toString());
  }

  function handleFahrenheitChange(val: string) {
    setFahrenheit(val);
    if (val === "") {
      setCelsius("");
      setKelvin("");
      return;
    }
    const f = parseFloat(val);
    const c = (f - 32) * 5 / 9;
    setCelsius(round(c).toString());
    setKelvin(round(c + 273.15).toString());
  }

  function handleKelvinChange(val: string) {
    setKelvin(val);
    if (val === "") {
      setCelsius("");
      setFahrenheit("");
      return;
    }
    const k = parseFloat(val);
    const c = k - 273.15;
    setCelsius(round(c).toString());
    setFahrenheit(round((c * 9) / 5 + 32).toString());
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex flex-col gap-4 relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-[var(--color-border-primary)] -z-10 hidden sm:block"></div>
        {/* Celsius */}
        <div className="flex items-center gap-4 bg-[var(--color-bg-primary)] p-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]">
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">°C</span>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Celsius
            </label>
            <input
              type="number"
              value={celsius}
              onChange={(e) => handleCelsiusChange(e.target.value)}
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>

        {/* Fahrenheit */}
        <div className="flex items-center gap-4 bg-[var(--color-bg-primary)] p-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]">
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">°F</span>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Fahrenheit
            </label>
            <input
              type="number"
              value={fahrenheit}
              onChange={(e) => handleFahrenheitChange(e.target.value)}
              placeholder="e.g. 77"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>

        {/* Kelvin */}
        <div className="flex items-center gap-4 bg-[var(--color-bg-primary)] p-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]">
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">K</span>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Kelvin
            </label>
            <input
              type="number"
              value={kelvin}
              onChange={(e) => handleKelvinChange(e.target.value)}
              placeholder="e.g. 298.15"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={() => {
            setCelsius("");
            setFahrenheit("");
            setKelvin("");
          }}
          disabled={!celsius && !fahrenheit && !kelvin}
          className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-6 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] disabled:opacity-40
                     disabled:cursor-not-allowed cursor-pointer"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
