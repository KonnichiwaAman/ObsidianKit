import { useMemo, useState } from "react";
import { Fuel } from "lucide-react";

type UnitSystem = "metric" | "imperial";

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function FuelEconomy() {
  const [system, setSystem] = useState<UnitSystem>("metric");
  const [distance, setDistance] = useState("350");
  const [fuelUsed, setFuelUsed] = useState("28");
  const [fuelPrice, setFuelPrice] = useState("1.2");
  const [tankCapacity, setTankCapacity] = useState("50");

  const result = useMemo(() => {
    const distanceValue = Number.parseFloat(distance);
    const fuelValue = Number.parseFloat(fuelUsed);
    const priceValue = Number.parseFloat(fuelPrice || "0");
    const tankValue = Number.parseFloat(tankCapacity || "0");

    if (
      !Number.isFinite(distanceValue) ||
      distanceValue <= 0 ||
      !Number.isFinite(fuelValue) ||
      fuelValue <= 0 ||
      !Number.isFinite(priceValue) ||
      priceValue < 0 ||
      !Number.isFinite(tankValue) ||
      tankValue < 0
    ) {
      return null;
    }

    if (system === "metric") {
      const kmPerL = distanceValue / fuelValue;
      const litersPer100 = (fuelValue / distanceValue) * 100;
      const mpgUs = (distanceValue * 0.621371) / (fuelValue * 0.2641720524);
      const tripCost = fuelValue * priceValue;
      const costPer100 = (tripCost / distanceValue) * 100;
      const estimatedRange = tankValue > 0 ? tankValue * kmPerL : 0;

      return {
        primaryMetric: `${kmPerL.toFixed(2)} km/L`,
        secondaryMetric: `${litersPer100.toFixed(2)} L/100km`,
        mpgUs,
        tripCost,
        costPerDistance: `${formatMoney(costPer100)} per 100 km`,
        estimatedRange,
      };
    }

    const mpgUs = distanceValue / fuelValue;
    const litersPer100 = 235.214583 / mpgUs;
    const kmPerL = (distanceValue * 1.609344) / (fuelValue * 3.785411784);
    const tripCost = fuelValue * priceValue;
    const costPer100 = (tripCost / distanceValue) * 100;
    const estimatedRange = tankValue > 0 ? tankValue * mpgUs : 0;

    return {
      primaryMetric: `${mpgUs.toFixed(2)} mpg (US)`,
      secondaryMetric: `${litersPer100.toFixed(2)} L/100km`,
      mpgUs,
      tripCost,
      costPerDistance: `${formatMoney(costPer100)} per 100 mi`,
      estimatedRange,
      kmPerL,
    };
  }, [system, distance, fuelUsed, fuelPrice, tankCapacity]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="mb-4 inline-flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
          <button
            onClick={() => setSystem("metric")}
            className={`rounded-md px-4 py-2 text-xs ${system === "metric" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
          >
            Metric (km, L)
          </button>
          <button
            onClick={() => setSystem("imperial")}
            className={`rounded-md px-4 py-2 text-xs ${system === "imperial" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
          >
            Imperial (mi, gal)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Distance ({system === "metric" ? "km" : "miles"})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Fuel Used ({system === "metric" ? "liters" : "gallons"})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={fuelUsed}
              onChange={(event) => setFuelUsed(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Fuel Price (per {system === "metric" ? "liter" : "gallon"})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={fuelPrice}
              onChange={(event) => setFuelPrice(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Tank Capacity ({system === "metric" ? "liters" : "gallons"})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={tankCapacity}
              onChange={(event) => setTankCapacity(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Primary Efficiency</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{result.primaryMetric}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">L/100km</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{result.secondaryMetric}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Trip Fuel Cost</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(result.tripCost)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Estimated Range</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">
                {result.estimatedRange.toFixed(1)} {system === "metric" ? "km" : "mi"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Additional Insights</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Cost efficiency</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{result.costPerDistance}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">MPG (US)</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{result.mpgUs.toFixed(2)}</span>
              </div>
              {system === "imperial" && result.kmPerL !== undefined && (
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">km/L equivalent</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{result.kmPerL.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
