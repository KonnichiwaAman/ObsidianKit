import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "ml", label: "Milliliter", symbol: "mL", toBase: 0.001 },
  { id: "l", label: "Liter", symbol: "L", toBase: 1 },
  { id: "tsp", label: "Teaspoon (US)", symbol: "tsp", toBase: 0.00492892159375 },
  { id: "tbsp", label: "Tablespoon (US)", symbol: "tbsp", toBase: 0.01478676478125 },
  { id: "cup-us", label: "Cup (US)", symbol: "cup", toBase: 0.2365882365 },
  { id: "cup-metric", label: "Cup (Metric)", symbol: "cup", toBase: 0.25 },
  { id: "fl-oz", label: "Fluid Ounce (US)", symbol: "fl oz", toBase: 0.0295735295625 },
  { id: "pt", label: "Pint (US)", symbol: "pt", toBase: 0.473176473 },
  { id: "qt", label: "Quart (US)", symbol: "qt", toBase: 0.946352946 },
];

export default function CookingConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="cup-us"
      defaultTo="ml"
      quickTableTitle="Kitchen equivalents"
      footerNote="Cooking conversions are volume-based. Ingredient weight varies by density (for example, flour vs sugar)."
    />
  );
}
