import { useDeferredValue, useMemo, useState } from "react";
import { tools } from "@/data/tools";
import type { Tool } from "@/types";

interface IndexedTool {
  tool: Tool;
  haystack: string;
}

const indexedTools: IndexedTool[] = tools.map((tool) => ({
  tool,
  haystack: `${tool.name} ${tool.description}`.toLowerCase(),
}));

export function useSearch() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results: Tool[] = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return [];

    return indexedTools
      .filter((entry) => entry.haystack.includes(q))
      .map((entry) => entry.tool);
  }, [deferredQuery]);

  return { query, setQuery, results };
}
