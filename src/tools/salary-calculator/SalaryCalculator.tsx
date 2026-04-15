import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";

type InputMode = "hourly" | "monthly" | "annual";

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function SalaryCalculator() {
  const [mode, setMode] = useState<InputMode>("annual");
  const [amount, setAmount] = useState("65000");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksPerYear, setWeeksPerYear] = useState("52");
  const [taxRate, setTaxRate] = useState("20");
  const [overtimeHoursPerWeek, setOvertimeHoursPerWeek] = useState("0");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");

  const result = useMemo(() => {
    const amountValue = Number.parseFloat(amount);
    const hoursValue = Number.parseFloat(hoursPerWeek);
    const weeksValue = Number.parseFloat(weeksPerYear);
    const taxValue = Number.parseFloat(taxRate || "0");
    const overtimeHoursValue = Number.parseFloat(overtimeHoursPerWeek || "0");
    const overtimeMultiplierValue = Number.parseFloat(overtimeMultiplier || "1");

    if (
      !Number.isFinite(amountValue) ||
      amountValue < 0 ||
      !Number.isFinite(hoursValue) ||
      hoursValue <= 0 ||
      !Number.isFinite(weeksValue) ||
      weeksValue <= 0 ||
      !Number.isFinite(taxValue) ||
      taxValue < 0 ||
      !Number.isFinite(overtimeHoursValue) ||
      overtimeHoursValue < 0 ||
      !Number.isFinite(overtimeMultiplierValue) ||
      overtimeMultiplierValue < 1
    ) {
      return null;
    }

    const yearlyWorkHours = hoursValue * weeksValue;
    const baseHourly =
      mode === "hourly"
        ? amountValue
        : mode === "monthly"
          ? (amountValue * 12) / yearlyWorkHours
          : amountValue / yearlyWorkHours;

    const annualBase = baseHourly * yearlyWorkHours;
    const annualOvertime = overtimeHoursValue * weeksValue * baseHourly * overtimeMultiplierValue;
    const annualGross = annualBase + annualOvertime;

    const monthlyGross = annualGross / 12;
    const biweeklyGross = annualGross / 26;
    const weeklyGross = annualGross / weeksValue;
    const dailyGross = weeklyGross / 5;

    const taxAmount = annualGross * (taxValue / 100);
    const annualNet = annualGross - taxAmount;

    return {
      baseHourly,
      annualBase,
      annualOvertime,
      annualGross,
      monthlyGross,
      biweeklyGross,
      weeklyGross,
      dailyGross,
      annualNet,
      monthlyNet: annualNet / 12,
      weeklyNet: annualNet / weeksValue,
      effectiveTax: taxAmount,
    };
  }, [mode, amount, hoursPerWeek, weeksPerYear, taxRate, overtimeHoursPerWeek, overtimeMultiplier]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Input Type</label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as InputMode)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="hourly">Hourly Pay</option>
              <option value="monthly">Monthly Salary</option>
              <option value="annual">Annual Salary</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Hours per Week</label>
            <input
              type="number"
              min="1"
              step="any"
              value={hoursPerWeek}
              onChange={(event) => setHoursPerWeek(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Working Weeks per Year</label>
            <input
              type="number"
              min="1"
              max="52"
              step="any"
              value={weeksPerYear}
              onChange={(event) => setWeeksPerYear(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Tax Rate</label>
            <input
              type="number"
              min="0"
              max="80"
              step="any"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Overtime Hours per Week</label>
            <input
              type="number"
              min="0"
              step="any"
              value={overtimeHoursPerWeek}
              onChange={(event) => setOvertimeHoursPerWeek(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Overtime Multiplier</label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={overtimeMultiplier}
              onChange={(event) => setOvertimeMultiplier(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Hourly</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(result.baseHourly)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Weekly Gross</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(result.weeklyGross)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Monthly Gross</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(result.monthlyGross)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Annual Gross</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(result.annualGross)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Take-Home Estimate</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">Tax Amount (Annual)</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.effectiveTax)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">Monthly Net</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.monthlyNet)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">Annual Net</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.annualNet)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Compensation Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Base Annual Pay</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.annualBase)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Overtime Annual Pay</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.annualOvertime)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Biweekly Gross</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.biweeklyGross)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Daily Gross (5-day week)</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.dailyGross)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Weekly Net</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatMoney(result.weeklyNet)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
