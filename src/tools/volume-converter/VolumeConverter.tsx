import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "ml", label: "Milliliter", symbol: "mL", toBase: 0.001 },
  { id: "l", label: "Liter", symbol: "L", toBase: 1 },
  { id: "m3", label: "Cubic Meter", symbol: "m3", toBase: 1000 },
  { id: "tsp-us", label: "US Teaspoon", symbol: "tsp", toBase: 0.00492892159375 },
  { id: "tbsp-us", label: "US Tablespoon", symbol: "tbsp", toBase: 0.01478676478125 },
  { id: "cup-us", label: "US Cup", symbol: "cup", toBase: 0.2365882365 },
  { id: "fl-oz-us", label: "US Fluid Ounce", symbol: "fl oz", toBase: 0.0295735295625 },
  { id: "pt-us", label: "US Pint", symbol: "pt", toBase: 0.473176473 },
  { id: "qt-us", label: "US Quart", symbol: "qt", toBase: 0.946352946 },
  { id: "gal-us", label: "US Gallon", symbol: "gal", toBase: 3.785411784 },
  { id: "gal-uk", label: "Imperial Gallon", symbol: "imp gal", toBase: 4.54609 },
  { id: "in3", label: "Cubic Inch", symbol: "in3", toBase: 0.016387064 },
  { id: "ft3", label: "Cubic Foot", symbol: "ft3", toBase: 28.316846592 },
];

export default function VolumeConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="l"
      defaultTo="ml"
      quickTableTitle="All volume equivalents"
      footerNote="Volume conversions use exact SI and US customary conversion constants."
    />
  );
}
