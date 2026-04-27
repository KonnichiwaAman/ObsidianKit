import type { Tool } from "../types";

const HIGH_INTENT_OVERRIDES: Record<string, string[]> = {
  "pdf-compressor": [
    "offline pdf compressor",
    "secure client-side pdf compressor",
    "compress pdf in browser no upload",
  ],
  "json-formatter": [
    "secure client-side json formatter",
    "offline json formatter",
    "json beautifier no upload",
  ],
  "password-generator": [
    "client-side secure password generator",
    "offline password generator",
    "random password generator no tracking",
  ],
};

function normalizeKeywordParts(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getToolKeywordCluster(tool: Tool, categoryName: string): string[] {
  const canonicalName = tool.name.trim();
  const category = normalizeKeywordParts(categoryName);
  const normalizedName = normalizeKeywordParts(canonicalName);

  const generatedKeywords = [
    `offline ${normalizedName}`,
    `client-side ${normalizedName}`,
    `secure ${normalizedName}`,
    `${normalizedName} no upload`,
    `${normalizedName} local browser`,
    `${normalizedName} free online tool`,
    `${normalizedName} privacy-first`,
    `${category} ${normalizedName}`,
  ];

  const overrideKeywords = HIGH_INTENT_OVERRIDES[tool.id] ?? [];
  return [...generatedKeywords, ...overrideKeywords];
}
