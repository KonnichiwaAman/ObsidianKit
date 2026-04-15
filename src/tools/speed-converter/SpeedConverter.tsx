import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "mps", label: "Meter per Second", symbol: "m/s", toBase: 1 },
  { id: "kph", label: "Kilometer per Hour", symbol: "km/h", toBase: 0.2777777778 },
  { id: "mph", label: "Mile per Hour", symbol: "mph", toBase: 0.44704 },
  { id: "knot", label: "Knot", symbol: "kn", toBase: 0.5144444444 },
  { id: "fps", label: "Foot per Second", symbol: "ft/s", toBase: 0.3048 },
  { id: "mach", label: "Mach (sea level)", symbol: "Mach", toBase: 340.29 },
];

export default function SpeedConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="kph"
      defaultTo="mph"
      quickTableTitle="All speed equivalents"
      footerNote="Mach conversion is approximate at sea-level standard atmospheric conditions."
    />
  );
}
