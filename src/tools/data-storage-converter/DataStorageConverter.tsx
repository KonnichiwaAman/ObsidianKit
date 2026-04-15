import { LinearUnitConverter, type LinearUnitDefinition } from "@/tools/shared/LinearUnitConverter";

const units: LinearUnitDefinition[] = [
  { id: "bit", label: "Bit", symbol: "b", toBase: 0.125 },
  { id: "byte", label: "Byte", symbol: "B", toBase: 1 },
  { id: "kb", label: "Kilobyte (decimal)", symbol: "KB", toBase: 1000 },
  { id: "mb", label: "Megabyte (decimal)", symbol: "MB", toBase: 1_000_000 },
  { id: "gb", label: "Gigabyte (decimal)", symbol: "GB", toBase: 1_000_000_000 },
  { id: "tb", label: "Terabyte (decimal)", symbol: "TB", toBase: 1_000_000_000_000 },
  { id: "kib", label: "Kibibyte (binary)", symbol: "KiB", toBase: 1024 },
  { id: "mib", label: "Mebibyte (binary)", symbol: "MiB", toBase: 1_048_576 },
  { id: "gib", label: "Gibibyte (binary)", symbol: "GiB", toBase: 1_073_741_824 },
  { id: "tib", label: "Tebibyte (binary)", symbol: "TiB", toBase: 1_099_511_627_776 },
];

export default function DataStorageConverter() {
  return (
    <LinearUnitConverter
      units={units}
      defaultFrom="mb"
      defaultTo="mib"
      quickTableTitle="All storage equivalents"
      footerNote="Decimal units (KB/MB/GB) use base-10. Binary units (KiB/MiB/GiB) use base-2."
    />
  );
}
