import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "m2", label: "Square Meter", symbol: "m2", toBase: 1 },
  { id: "km2", label: "Square Kilometer", symbol: "km2", toBase: 1_000_000 },
  { id: "cm2", label: "Square Centimeter", symbol: "cm2", toBase: 0.0001 },
  { id: "mm2", label: "Square Millimeter", symbol: "mm2", toBase: 0.000001 },
  { id: "ft2", label: "Square Foot", symbol: "ft2", toBase: 0.09290304 },
  { id: "in2", label: "Square Inch", symbol: "in2", toBase: 0.00064516 },
  { id: "yd2", label: "Square Yard", symbol: "yd2", toBase: 0.83612736 },
  { id: "acre", label: "Acre", symbol: "ac", toBase: 4046.8564224 },
  { id: "hectare", label: "Hectare", symbol: "ha", toBase: 10000 },
  { id: "mi2", label: "Square Mile", symbol: "mi2", toBase: 2_589_988.110336 },
];

export default function AreaConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="m2"
      defaultTo="ft2"
      quickTableTitle="All area equivalents"
      footerNote="Useful for land, room, and map measurements across metric and imperial systems."
    />
  );
}
