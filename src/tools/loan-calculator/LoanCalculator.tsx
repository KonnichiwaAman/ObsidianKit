import { useState, useMemo } from "react";
import { Copy, Check, CircleDollarSign } from "lucide-react";

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("5");
  const [copied, setCopied] = useState(false);

  const results = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const y = parseFloat(years);

    if (!p || !r || !y || p <= 0 || r <= 0 || y <= 0) {
      return null;
    }

    const monthlyInterestRatio = r / 100 / 12;
    const numberOfPayments = y * 12;

    const top = Math.pow(1 + monthlyInterestRatio, numberOfPayments);
    const bottom = top - 1;
    const sp = top / bottom;
    const emi = p * monthlyInterestRatio * sp;

    const totalPayment = emi * numberOfPayments;
    const totalInterest = totalPayment - p;

    return {
      emi,
      totalPayment,
      totalInterest,
    };
  }, [principal, rate, years]);

  function handleCopy() {
    if (!results) return;
    const text = `Loan EMI: $${results.emi.toFixed(2)}\nTotal Interest: $${results.totalInterest.toFixed(2)}\nTotal Payment: $${results.totalPayment.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-5 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Loan Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-[var(--color-text-muted)]">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                min="0"
                className="w-full rounded-xl border border-[var(--color-border-primary)]
                           bg-[var(--color-bg-input)] pl-11 pr-4 py-3 text-sm font-medium
                           text-[var(--color-text-primary)] outline-none
                           focus:border-[var(--color-border-hover)]
                           transition-colors duration-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Interest Rate (%, Yearly)
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="0"
              step="0.1"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm font-medium
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              Loan Term (Years)
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              min="0"
              step="1"
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm font-medium
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col justify-between space-y-6">
          {results ? (
            <div className="flex-1 space-y-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
              <div className="text-center pb-4 border-b border-[var(--color-border-primary)]">
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Monthly EMI</p>
                <p className="text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  ${results.emi.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[var(--color-border-primary)]">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Principal</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    ${parseFloat(principal).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Total Interest</p>
                  <p className="text-lg font-semibold text-red-500">
                    ${results.totalInterest.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Total Payment</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)]">
                  ${results.totalPayment.toFixed(2)}
                </p>
              </div>

              <div className="pt-4 mt-auto">
                <button
                  onClick={handleCopy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)]
                             px-5 py-3 text-sm font-semibold text-[var(--color-bg-primary)]
                             transition-opacity duration-200 hover:opacity-90 cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Results"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-[var(--color-border-primary)] border-dashed bg-[var(--color-bg-card)] p-6 text-center">
              <div className="max-w-[200px]">
                <CircleDollarSign className="mx-auto mb-3 h-8 w-8 text-[var(--color-border-hover)]" />
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Enter valid loan details to see your payment breakdown.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
