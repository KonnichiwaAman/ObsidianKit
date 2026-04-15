import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

type Frequency = "monthly" | "quarterly" | "yearly";
type Compounding = "monthly" | "quarterly" | "yearly" | "daily";

const CONTRIBUTION_PERIODS: Record<Frequency, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const COMPOUNDING_PERIODS: Record<Compounding, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
  daily: 365,
};

interface YearSnapshot {
  periodLabel: string;
  endBalance: number;
  contribution: number;
  interest: number;
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function simulateGrowth(
  principal: number,
  annualRatePct: number,
  years: number,
  contribution: number,
  contributionFrequency: Frequency,
  compounding: Compounding,
) {
  const totalMonths = Math.max(1, Math.round(years * 12));
  const annualRate = annualRatePct / 100;
  const compoundingPeriods = COMPOUNDING_PERIODS[compounding];
  const monthlyRate =
    compoundingPeriods > 0
      ? Math.pow(1 + annualRate / compoundingPeriods, compoundingPeriods / 12) - 1
      : 0;

  const contributionPeriods = CONTRIBUTION_PERIODS[contributionFrequency];
  const contributionIntervalMonths = 12 / contributionPeriods;

  let balance = principal;
  let totalContributed = principal;
  let totalInterest = 0;

  let currentPeriodContribution = 0;
  let currentPeriodInterest = 0;
  const snapshots: YearSnapshot[] = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    const beforeGrowth = balance;
    balance *= 1 + monthlyRate;

    const earned = balance - beforeGrowth;
    totalInterest += earned;
    currentPeriodInterest += earned;

    const ratio = month / contributionIntervalMonths;
    const isContributionMonth = contribution > 0 && Math.abs(ratio - Math.round(ratio)) < 1e-9;
    if (isContributionMonth) {
      balance += contribution;
      totalContributed += contribution;
      currentPeriodContribution += contribution;
    }

    if (month % 12 === 0 || month === totalMonths) {
      const yearNumber = month / 12;
      snapshots.push({
        periodLabel: yearNumber % 1 === 0 ? `Year ${yearNumber.toFixed(0)}` : `Year ${yearNumber.toFixed(2)}`,
        endBalance: balance,
        contribution: currentPeriodContribution,
        interest: currentPeriodInterest,
      });

      currentPeriodContribution = 0;
      currentPeriodInterest = 0;
    }
  }

  return {
    finalBalance: balance,
    totalContributed,
    totalInterest,
    snapshots,
  };
}

export default function CompoundInterest() {
  const [principal, setPrincipal] = useState("10000");
  const [annualRate, setAnnualRate] = useState("8");
  const [years, setYears] = useState("10");
  const [contribution, setContribution] = useState("200");
  const [contributionFrequency, setContributionFrequency] = useState<Frequency>("monthly");
  const [compounding, setCompounding] = useState<Compounding>("monthly");
  const [inflationRate, setInflationRate] = useState("2");

  const metrics = useMemo(() => {
    const principalValue = Number.parseFloat(principal);
    const annualRateValue = Number.parseFloat(annualRate);
    const yearsValue = Number.parseFloat(years);
    const contributionValue = Number.parseFloat(contribution || "0");
    const inflationRateValue = Number.parseFloat(inflationRate || "0");

    if (
      !Number.isFinite(principalValue) ||
      principalValue < 0 ||
      !Number.isFinite(annualRateValue) ||
      !Number.isFinite(yearsValue) ||
      yearsValue <= 0 ||
      !Number.isFinite(contributionValue) ||
      contributionValue < 0 ||
      !Number.isFinite(inflationRateValue)
    ) {
      return null;
    }

    const simulation = simulateGrowth(
      principalValue,
      annualRateValue,
      yearsValue,
      contributionValue,
      contributionFrequency,
      compounding,
    );

    const realValue = simulation.finalBalance / Math.pow(1 + inflationRateValue / 100, yearsValue);
    const growthMultiple = principalValue > 0 ? simulation.finalBalance / principalValue : 0;
    const roi = simulation.totalContributed > 0
      ? ((simulation.finalBalance - simulation.totalContributed) / simulation.totalContributed) * 100
      : 0;

    return {
      ...simulation,
      realValue,
      growthMultiple,
      roi,
      principalValue,
      annualRateValue,
      yearsValue,
      contributionValue,
      inflationRateValue,
    };
  }, [principal, annualRate, years, contribution, contributionFrequency, compounding, inflationRate]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Initial Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Annual Return Rate</label>
            <input
              type="number"
              step="any"
              value={annualRate}
              onChange={(event) => setAnnualRate(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Investment Duration (Years)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={years}
              onChange={(event) => setYears(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Inflation Rate (Optional)</label>
            <input
              type="number"
              step="any"
              value={inflationRate}
              onChange={(event) => setInflationRate(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Recurring Contribution</label>
            <input
              type="number"
              min="0"
              step="any"
              value={contribution}
              onChange={(event) => setContribution(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Contribution Frequency</label>
            <select
              value={contributionFrequency}
              onChange={(event) => setContributionFrequency(event.target.value as Frequency)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Compounding</label>
            <select
              value={compounding}
              onChange={(event) => setCompounding(event.target.value as Compounding)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Future Value</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(metrics.finalBalance)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Total Invested</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(metrics.totalContributed)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Interest Earned</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(metrics.totalInterest)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Real Value (After Inflation)</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{formatMoney(metrics.realValue)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Performance Summary</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">Annual Return Input</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatPercent(metrics.annualRateValue)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">ROI on Contributions</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatPercent(metrics.roi)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-muted)]">Growth Multiple</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{metrics.growthMultiple.toFixed(2)}x</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Yearly Breakdown</p>
            <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
              {metrics.snapshots.map((row) => (
                <div
                  key={row.periodLabel}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 sm:grid-cols-4"
                >
                  <p className="text-xs text-[var(--color-text-secondary)]">{row.periodLabel}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Contributed: <span className="text-[var(--color-text-primary)]">{formatMoney(row.contribution)}</span></p>
                  <p className="text-xs text-[var(--color-text-muted)]">Interest: <span className="text-[var(--color-text-primary)]">{formatMoney(row.interest)}</span></p>
                  <p className="text-xs text-[var(--color-text-muted)]">Balance: <span className="text-[var(--color-text-primary)]">{formatMoney(row.endBalance)}</span></p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
