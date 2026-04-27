import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, RefreshCw, Copy, Check, AlertTriangle } from "lucide-react";

interface CurrencyRates {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
  source: "live" | "fallback" | "cached";
}

const FALLBACK_RATES: CurrencyRates = {
  base: "USD",
  timestamp: Date.now(),
  source: "fallback",
  rates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.2,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 152.8,
    CNY: 7.18,
    SGD: 1.35,
    AED: 3.67,
  },
};

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AED", name: "UAE Dirham" },
] as const;

const RATE_REQUEST_TIMEOUT_MS = 12000;

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 6,
    }).format(value);
  } catch {
    return `${value.toFixed(6)} ${currency}`;
  }
}

async function fetchRates(signal: AbortSignal): Promise<CurrencyRates> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal });
  if (!response.ok) {
    throw new Error("Rate provider unavailable");
  }

  const isCached = response.headers.get("X-Is-Stale-Cache") === "true";

  const data = (await response.json()) as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_unix?: number;
  };

  if (data.result !== "success" || !data.rates) {
    throw new Error("Invalid rate payload");
  }

  const filteredRates: Record<string, number> = {};
  for (const currency of CURRENCIES) {
    const rate = data.rates[currency.code];
    if (typeof rate === "number" && Number.isFinite(rate)) {
      filteredRates[currency.code] = rate;
    }
  }

  if (!filteredRates.USD) {
    filteredRates.USD = 1;
  }

  return {
    base: "USD",
    rates: filteredRates,
    timestamp: (data.time_last_update_unix ?? Date.now() / 1000) * 1000,
    source: isCached ? "cached" : "live",
  };
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [rates, setRates] = useState<CurrencyRates>(FALLBACK_RATES);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);
  const copyResetTimerRef = useRef<number | null>(null);

  const refreshRates = useCallback(async (externalSignal?: AbortSignal) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), RATE_REQUEST_TIMEOUT_MS);

    const syncAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", syncAbort, { once: true });
      }
    }

    setLoadingRates(true);
    setRateError(null);

    try {
      const latest = await fetchRates(controller.signal);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setRates(latest);
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;

      const timedOut = error instanceof Error && /abort|timeout/i.test(error.message);
      setRateError(
        timedOut
          ? "Rate request timed out. Using built-in fallback rates."
          : "Could not fetch live rates. Using built-in fallback rates.",
      );
      setRates((previous) => ({
        ...previous,
        source: "fallback",
        timestamp: Date.now(),
      }));
    } finally {
      window.clearTimeout(timeoutId);

      if (externalSignal) {
        externalSignal.removeEventListener("abort", syncAbort);
      }

      if (requestId === requestIdRef.current) {
        setLoadingRates(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshRates(controller.signal);

    return () => controller.abort();
  }, [refreshRates]);

  const numericAmount = Number.parseFloat(amount);
  const hasValidAmount = Number.isFinite(numericAmount);

  const conversion = useMemo(() => {
    if (!hasValidAmount) return null;

    const fromRate = rates.rates[fromCurrency];
    const toRate = rates.rates[toCurrency];
    if (!fromRate || !toRate) return null;

    const amountInUsd = numericAmount / fromRate;
    const converted = amountInUsd * toRate;
    const oneFromTo = (1 / fromRate) * toRate;

    return {
      converted,
      oneFromTo,
    };
  }, [hasValidAmount, numericAmount, rates, fromCurrency, toCurrency]);

  const marketTable = useMemo(() => {
    if (!hasValidAmount) return [] as Array<{ code: string; value: number }>;

    const fromRate = rates.rates[fromCurrency];
    if (!fromRate) return [];

    const amountInUsd = numericAmount / fromRate;
    return CURRENCIES.map((currency) => ({
      code: currency.code,
      value: amountInUsd * (rates.rates[currency.code] ?? 0),
    })).filter((row) => row.code !== fromCurrency);
  }, [hasValidAmount, numericAmount, rates, fromCurrency]);

  function handleSwap() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  async function handleCopy() {
    if (!conversion || !hasValidAmount) return;

    const text = `${formatMoney(numericAmount, fromCurrency)} = ${formatMoney(conversion.converted, toCurrency)} (1 ${fromCurrency} = ${conversion.oneFromTo.toFixed(6)} ${toCurrency})`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      setRateError("Could not copy the conversion result.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">From</label>
            <select
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div className="flex items-center justify-center pt-7 sm:pt-0">
            <button
              onClick={handleSwap}
              className="rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2.5 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              aria-label="Swap currencies"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">To</label>
            <select
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            <div className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3">
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {conversion ? formatMoney(conversion.converted, toCurrency) : "-"}
              </p>
            </div>
          </div>
        </div>

        {conversion && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4 py-3">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                1 {fromCurrency} = {conversion.oneFromTo.toFixed(6)} {toCurrency}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Last rate update: {new Date(rates.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Source: {rates.source === "fallback" ? "Built-in fallback estimates" : rates.source === "cached" ? "Cached exchange feed (Offline)" : "Live exchange feed"}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-2 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              aria-label="Copy result"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Market snapshot from {fromCurrency}</p>
          <button
            onClick={() => void refreshRates()}
            disabled={loadingRates}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRates ? "animate-spin" : ""}`} />
            Refresh Rates
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {marketTable.map((row) => (
            <div
              key={row.code}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2"
            >
              <span className="text-xs text-[var(--color-text-secondary)]">{row.code}</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {formatMoney(row.value, row.code)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(rateError || rates.source === "fallback" || rates.source === "cached") && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="inline-flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {rateError ?? 
              (rates.source === "cached" 
                ? "You are offline. Using cached exchange rates from your last visit." 
                : "Using bundled fallback exchange rates. Refresh when online for latest rates.")}
          </p>
        </div>
      )}
    </div>
  );
}
