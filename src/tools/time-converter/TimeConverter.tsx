import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "ms", label: "Millisecond", symbol: "ms", toBase: 0.001 },
  { id: "sec", label: "Second", symbol: "s", toBase: 1 },
  { id: "min", label: "Minute", symbol: "min", toBase: 60 },
  { id: "hour", label: "Hour", symbol: "h", toBase: 3600 },
  { id: "day", label: "Day", symbol: "d", toBase: 86400 },
  { id: "week", label: "Week", symbol: "wk", toBase: 604800 },
  { id: "month", label: "Month (avg)", symbol: "mo", toBase: 2_629_746 },
  { id: "year", label: "Year (avg)", symbol: "yr", toBase: 31_556_952 },
];

export default function TimeConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="hour"
      defaultTo="min"
      quickTableTitle="All time equivalents"
      footerNote="Month and year use astronomical averages to provide consistent long-range conversions."
    />
  );
}
