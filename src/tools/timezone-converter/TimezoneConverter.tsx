import { useMemo, useState } from "react";
import { Clock } from "lucide-react";

const TIME_ZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

function getLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number.parseInt(map.year, 10),
    month: Number.parseInt(map.month, 10),
    day: Number.parseInt(map.day, 10),
    hour: Number.parseInt(map.hour, 10),
    minute: Number.parseInt(map.minute, 10),
    second: Number.parseInt(map.second, 10),
  };
}

function zonedTimeToDate(localDateTime: string, sourceTimeZone: string) {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map((part) => Number.parseInt(part, 10));
  const [hour, minute] = (timePart ?? "00:00").split(":").map((part) => Number.parseInt(part, 10));

  if (![year, month, day, hour, minute].every((value) => Number.isFinite(value))) {
    throw new Error("Invalid date or time.");
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const guessedDate = new Date(utcGuess);

  const sourceParts = getDatePartsInTimeZone(guessedDate, sourceTimeZone);
  const asIfUtc = Date.UTC(
    sourceParts.year,
    sourceParts.month - 1,
    sourceParts.day,
    sourceParts.hour,
    sourceParts.minute,
    sourceParts.second,
  );

  const offset = asIfUtc - utcGuess;
  return new Date(utcGuess - offset);
}

function formatForZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

export default function TimezoneConverter() {
  const [sourceZone, setSourceZone] = useState<string>("UTC");
  const [targetZone, setTargetZone] = useState<string>("America/New_York");
  const [inputDateTime, setInputDateTime] = useState(getLocalInputValue(new Date()));

  const conversion = useMemo(() => {
    try {
      const sourceDate = zonedTimeToDate(inputDateTime, sourceZone);
      return {
        sourceDate,
        targetFormatted: formatForZone(sourceDate, targetZone),
        sourceFormatted: formatForZone(sourceDate, sourceZone),
        worldClock: TIME_ZONES.map((zone) => ({
          zone,
          value: formatForZone(sourceDate, zone),
        })),
        error: null as string | null,
      };
    } catch (conversionError) {
      return {
        sourceDate: null,
        targetFormatted: "",
        sourceFormatted: "",
        worldClock: [] as Array<{ zone: string; value: string }>,
        error: conversionError instanceof Error ? conversionError.message : "Invalid date/time input",
      };
    }
  }, [inputDateTime, sourceZone, targetZone]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Date & Time</label>
          <input
            type="datetime-local"
            value={inputDateTime}
            onChange={(event) => setInputDateTime(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">From Time Zone</label>
            <select
              value={sourceZone}
              onChange={(event) => setSourceZone(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              {TIME_ZONES.map((zone) => (
                <option key={`source-${zone}`} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">To Time Zone</label>
            <select
              value={targetZone}
              onChange={(event) => setTargetZone(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              {TIME_ZONES.map((zone) => (
                <option key={`target-${zone}`} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {conversion.error && <p className="text-xs text-red-500">{conversion.error}</p>}
      </div>

      {!conversion.error && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Source Time</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{conversion.sourceFormatted}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Target Time</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{conversion.targetFormatted}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            <p className="inline-flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              <Clock className="h-4 w-4 text-[var(--color-text-secondary)]" />
              Same Instant Across Major Time Zones
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {conversion.worldClock.map((row) => (
                <div
                  key={row.zone}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2"
                >
                  <span className="text-xs text-[var(--color-text-secondary)]">{row.zone}</span>
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
