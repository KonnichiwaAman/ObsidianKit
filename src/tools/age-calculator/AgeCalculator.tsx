import { useMemo, useState } from "react";

interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  totalHours: number;
}

function calculateAgeResult(start: string, end: string): AgeResult | null {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
    return null;
  }

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const timeDiff = endDate.getTime() - startDate.getTime();
  const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  const totalHours = totalDays * 24;

  return {
    years,
    months,
    days,
    totalMonths,
    totalWeeks,
    totalDays,
    totalHours,
  };
}

export default function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [calculateDate, setCalculateDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const result = useMemo(() => {
    if (!dob || !calculateDate) return null;
    return calculateAgeResult(dob, calculateDate);
  }, [dob, calculateDate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            Date of Birth
          </label>
          <div className="relative">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)]
                         bg-[var(--color-bg-input)] px-4 py-3 text-sm
                         text-[var(--color-text-primary)] outline-none
                         focus:border-[var(--color-border-hover)]
                         transition-colors duration-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            Calculate Age At
          </label>
          <input
            type="date"
            value={calculateDate}
            onChange={(e) => setCalculateDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-input)] px-4 py-3 text-sm
                       text-[var(--color-text-primary)] outline-none
                       focus:border-[var(--color-border-hover)]
                       transition-colors duration-200"
          />
        </div>
      </div>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 text-center">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">You are</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-[var(--color-text-primary)]">{result.years}</span>
                <span className="block text-xs font-medium text-[var(--color-text-muted)] mt-1">Years</span>
              </div>
              <span className="text-2xl text-[var(--color-text-muted)] p-2">-</span>
              <div className="text-center">
                <span className="text-4xl font-bold text-[var(--color-text-primary)]">{result.months}</span>
                <span className="block text-xs font-medium text-[var(--color-text-muted)] mt-1">Months</span>
              </div>
              <span className="text-2xl text-[var(--color-text-muted)] p-2">-</span>
              <div className="text-center">
                <span className="text-4xl font-bold text-[var(--color-text-primary)]">{result.days}</span>
                <span className="block text-xs font-medium text-[var(--color-text-muted)] mt-1">Days</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{result.totalMonths.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Total Months</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{result.totalWeeks.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Total Weeks</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{result.totalDays.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Total Days</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{result.totalHours.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Total Hours</p>
            </div>
          </div>
        </div>
      )}
      {!result && dob && calculateDate && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-500">
          Invalid dates. Make sure the 'Calculate Age At' date is after your 'Date of Birth'.
        </div>
      )}
    </div>
  );
}
