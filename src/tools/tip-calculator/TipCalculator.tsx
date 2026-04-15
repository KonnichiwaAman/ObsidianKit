import { useMemo, useState } from "react";
import { DollarSign } from "lucide-react";

type RoundMode = "none" | "nearest" | "up" | "down";
type TipBase = "subtotal" | "subtotal-plus-tax";

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function applyRounding(value: number, mode: RoundMode) {
  switch (mode) {
    case "up":
      return Math.ceil(value);
    case "down":
      return Math.floor(value);
    case "nearest":
      return Math.round(value);
    default:
      return value;
  }
}

export default function TipCalculator() {
  const [billAmount, setBillAmount] = useState("85");
  const [taxRate, setTaxRate] = useState("8");
  const [tipRate, setTipRate] = useState("18");
  const [splitCount, setSplitCount] = useState("2");
  const [tipBase, setTipBase] = useState<TipBase>("subtotal");
  const [roundMode, setRoundMode] = useState<RoundMode>("none");

  const totals = useMemo(() => {
    const bill = Number.parseFloat(billAmount);
    const taxPercent = Number.parseFloat(taxRate || "0");
    const tipPercent = Number.parseFloat(tipRate || "0");
    const people = Number.parseInt(splitCount || "1", 10);

    if (
      !Number.isFinite(bill) ||
      bill < 0 ||
      !Number.isFinite(taxPercent) ||
      taxPercent < 0 ||
      !Number.isFinite(tipPercent) ||
      tipPercent < 0 ||
      !Number.isFinite(people) ||
      people <= 0
    ) {
      return null;
    }

    const taxAmount = bill * (taxPercent / 100);
    const baseForTip = tipBase === "subtotal-plus-tax" ? bill + taxAmount : bill;
    const unroundedTip = baseForTip * (tipPercent / 100);

    let total = bill + taxAmount + unroundedTip;
    if (roundMode !== "none") {
      total = applyRounding(total, roundMode);
    }

    const adjustedTip = Math.max(0, total - bill - taxAmount);

    return {
      bill,
      taxAmount,
      adjustedTip,
      total,
      perPerson: total / people,
      tipPerPerson: adjustedTip / people,
      taxPerPerson: taxAmount / people,
      subtotalPerPerson: bill / people,
      effectiveTipRate: baseForTip > 0 ? (adjustedTip / baseForTip) * 100 : 0,
    };
  }, [billAmount, taxRate, tipRate, splitCount, tipBase, roundMode]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Bill Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={billAmount}
              onChange={(event) => setBillAmount(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Tax Rate</label>
            <input
              type="number"
              min="0"
              step="any"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Tip Percentage</label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={tipRate}
              onChange={(event) => setTipRate(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Split Between People</label>
            <input
              type="number"
              min="1"
              step="1"
              value={splitCount}
              onChange={(event) => setSplitCount(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Tip Calculated On</label>
            <select
              value={tipBase}
              onChange={(event) => setTipBase(event.target.value as TipBase)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="subtotal">Subtotal only</option>
              <option value="subtotal-plus-tax">Subtotal + tax</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Rounding Rule</label>
            <select
              value={roundMode}
              onChange={(event) => setRoundMode(event.target.value as RoundMode)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="none">No rounding</option>
              <option value="nearest">Round total to nearest whole</option>
              <option value="up">Round total up</option>
              <option value="down">Round total down</option>
            </select>
          </div>
        </div>
      </div>

      {totals && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Tip Amount</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(totals.adjustedTip)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Tax Amount</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(totals.taxAmount)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Total Bill</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(totals.total)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Per Person</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(totals.perPerson)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Split Breakdown</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Subtotal per person</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(totals.subtotalPerPerson)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Tax per person</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(totals.taxPerPerson)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Tip per person</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(totals.tipPerPerson)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Effective tip rate</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{totals.effectiveTipRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
