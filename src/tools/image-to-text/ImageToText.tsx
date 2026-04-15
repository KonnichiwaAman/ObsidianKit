import { useMemo, useState } from "react";
import { Clipboard, Download, LoaderCircle, ScanText, Upload } from "lucide-react";

const OCR_LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "deu", label: "German" },
  { value: "fra", label: "French" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
] as const;

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface OcrResult {
  fileName: string;
  text: string;
}

export default function ImageToText() {
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState<(typeof OCR_LANGUAGES)[number]["value"]>("eng");
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [copied, setCopied] = useState(false);

  const combinedText = useMemo(() => {
    return results
      .map((entry) => `--- ${entry.fileName} ---\n${entry.text.trim()}`)
      .join("\n\n")
      .trim();
  }, [results]);

  async function runOcr() {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setError(null);
    setResults([]);
    setCopied(false);

    let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;

    try {
      const tesseract = await import("tesseract.js");
      setProgressLabel("Loading OCR engine...");
      worker = await tesseract.createWorker(language);

      const nextResults: OcrResult[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgressLabel(`Reading image ${index + 1}/${files.length}: ${file.name}`);
        const response = await worker.recognize(file);
        nextResults.push({
          fileName: file.name,
          text: response.data.text,
        });
      }

      setResults(nextResults);
      setProgressLabel("OCR complete.");
    } catch (ocrError) {
      setError(ocrError instanceof Error ? ocrError.message : "OCR failed for selected images.");
      setProgressLabel("");
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setProcessing(false);
    }
  }

  async function copyResult() {
    if (!combinedText) return;
    await navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">OCR Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as (typeof OCR_LANGUAGES)[number]["value"])}
            className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
          >
            {OCR_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <Upload className="h-3.5 w-3.5" />
            Select images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="hidden"
            />
          </label>

          <div className="mt-3 space-y-1">
            {files.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">No images selected</p>
            ) : (
              files.map((file) => (
                <p key={file.name} className="text-xs text-[var(--color-text-secondary)]">
                  {file.name}
                </p>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => void runOcr()}
          disabled={files.length === 0 || processing}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--color-bg-primary)] disabled:opacity-50"
        >
          {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
          {processing ? "Running OCR..." : "Extract Text"}
        </button>

        {progressLabel && <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {combinedText && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Extracted Text</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void copyResult()}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <Clipboard className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => downloadText(combinedText, "image-ocr.txt")}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </div>

          <textarea
            value={combinedText}
            readOnly
            rows={14}
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none"
          />
        </div>
      )}
    </div>
  );
}
