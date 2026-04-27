import {
  Image,
  FileText,
  Film,
  Ruler,
  Calculator,
  Code,
} from "lucide-react";
import type { Category } from "../types";
import { tools } from "./tools";

const toolCountByCategory = tools.reduce<Record<string, number>>((accumulator, tool) => {
  const current = accumulator[tool.categoryId] ?? 0;
  accumulator[tool.categoryId] = current + 1;
  return accumulator;
}, {});

export const categories: Category[] = [
  {
    id: "image-tools",
    name: "Image Tools",
    description: "Convert, compress, resize, crop, and optimize your images",
    icon: Image,
    path: "/category/image-tools",
    toolCount: toolCountByCategory["image-tools"] ?? 0,
  },
  {
    id: "pdf-tools",
    name: "PDF Tools",
    description: "Merge, split, compress, convert, and secure your PDFs",
    icon: FileText,
    path: "/category/pdf-tools",
    toolCount: toolCountByCategory["pdf-tools"] ?? 0,
  },
  {
    id: "video-audio-tools",
    name: "Video & Audio",
    description: "Compress, convert, trim, and extract video and audio files",
    icon: Film,
    path: "/category/video-audio-tools",
    toolCount: toolCountByCategory["video-audio-tools"] ?? 0,
  },
  {
    id: "unit-converters",
    name: "Unit Converters",
    description: "Convert length, weight, temperature, currency, and more",
    icon: Ruler,
    path: "/category/unit-converters",
    toolCount: toolCountByCategory["unit-converters"] ?? 0,
  },
  {
    id: "calculators",
    name: "Calculators",
    description: "BMI, loan, percentage, GPA, tip, and scientific calculators",
    icon: Calculator,
    path: "/category/calculators",
    toolCount: toolCountByCategory["calculators"] ?? 0,
  },
  {
    id: "developer-text-tools",
    name: "Developer & Text",
    description: "JSON formatter, Base64, regex tester, password generator, QR codes",
    icon: Code,
    path: "/category/developer-text-tools",
    toolCount: toolCountByCategory["developer-text-tools"] ?? 0,
  },
];

const categoriesById = new Map(categories.map((category) => [category.id, category]));

export function getCategoryById(id: string): Category | undefined {
  return categoriesById.get(id);
}
