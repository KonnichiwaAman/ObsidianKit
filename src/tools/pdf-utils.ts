let pdfJsModulePromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function baseFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export function parsePageRanges(input: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];

  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const result: number[] = [];
  const seen = new Set<number>();

  for (const token of trimmed.split(",").map((segment) => segment.trim()).filter(Boolean)) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(totalPages, Math.max(start, end));
      for (let page = from; page <= to; page += 1) {
        if (!seen.has(page)) {
          seen.add(page);
          result.push(page);
        }
      }
      continue;
    }

    const single = Number(token);
    if (Number.isInteger(single) && single >= 1 && single <= totalPages && !seen.has(single)) {
      seen.add(single);
      result.push(single);
    }
  }

  return result;
}

export async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
      }
      return pdfjs;
    });
  }
  return pdfJsModulePromise;
}

export async function openPdfWithPdfJs(pdfBytes: Uint8Array) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: toArrayBuffer(pdfBytes) });
  return loadingTask.promise;
}

export async function extractPdfText(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
  onPageDone?: (processed: number, total: number) => void,
): Promise<string[]> {
  const pdfDocument = await openPdfWithPdfJs(pdfBytes);

  try {
    const pagesText: string[] = [];
    for (let index = 0; index < pageNumbers.length; index += 1) {
      const pageNumber = pageNumbers[index];
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const words: string[] = [];
      for (const item of textContent.items as Array<{ str?: string; hasEOL?: boolean }>) {
        if (!item.str) continue;
        words.push(item.str);
        if (item.hasEOL) words.push("\n");
      }

      const merged = words.join(" ")
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      pagesText.push(merged);
      page.cleanup();
      if (onPageDone) onPageDone(index + 1, pageNumbers.length);
    }

    return pagesText;
  } finally {
    await pdfDocument.destroy();
  }
}
