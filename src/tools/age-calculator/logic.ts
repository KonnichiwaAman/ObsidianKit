export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  totalHours: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
}

export function calculateAgeResult(start: string, end: string): AgeResult | null {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate || startDate > endDate) return null;

  let totalWholeMonths =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth();
  let anniversary = addMonthsClamped(startDate, totalWholeMonths);
  if (anniversary > endDate) {
    totalWholeMonths -= 1;
    anniversary = addMonthsClamped(startDate, totalWholeMonths);
  }

  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS);
  return {
    years: Math.floor(totalWholeMonths / 12),
    months: totalWholeMonths % 12,
    days: Math.floor((endDate.getTime() - anniversary.getTime()) / DAY_MS),
    totalMonths: totalWholeMonths,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
    totalHours: totalDays * 24,
  };
}
