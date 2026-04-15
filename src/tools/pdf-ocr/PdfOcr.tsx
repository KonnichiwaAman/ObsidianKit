import { useRef, useState } from "react";
import { Clipboard, Download, LoaderCircle, ScanText } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, openPdfWithPdfJs, parsePageRanges } from "@/tools/pdf-utils";

const OCR_LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "deu", label: "German" },
  { value: "fra", label: "French" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
] as const;

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

export default function PdfOcr() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("all");
  const [language, setLanguage] = useState<(typeof OCR_LANGUAGES)[number]["value"]>("eng");
  const [renderScale, setRenderScale] = useState<1.5 | 2>(2);
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function handleUpload(files: File[]) {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResultText("");
    setErrorMessage(null);
    setProgressLabel("");
    setCopied(false);

    try {
      const pdf = await PDFDocument.load(await selectedFile.arrayBuffer());
      const pages = pdf.getPageCount();
      setPageCount(pages);
      setPageInput(`1-${pages}`);
    } catch {
      setPageCount(0);
      setPageInput("all");
      setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleRunOcr() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setCopied(false);
    setResultText("");

    const pages = parsePageRanges(pageInput, pageCount);
    if (pages.length === 0) {
      setErrorMessage("Please enter a valid page range.");
      setProcessing(false);
      return;
    }

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;

    let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;
    let pdfDocument: Awaited<ReturnType<typeof openPdfWithPdfJs>> | null = null;

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      pdfDocument = await openPdfWithPdfJs(sourceBytes);

      setProgressLabel("Loading OCR engine...");
      const tesseract = await import("tesseract.js");
      const workerInstance = await tesseract.createWorker(language);
      worker = workerInstance;

      const pageResults: string[] = [];

      for (let index = 0; index < pages.length; index += 1) {
        const pageNumber = pages[index];
        setProgressLabel(`Rendering page ${index + 1}/${pages.length}...`);

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: renderScale });

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          throw new Error("Canvas rendering is unavailable in this browser.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: "rgb(255,255,255)",
        });
        await renderTask.promise;
        page.cleanup();

        const imageBlob = await canvasToBlob(canvas);
        if (!imageBlob) {
          throw new Error(`Failed to rasterize page ${pageNumber}.`);
        }

        setProgressLabel(`Running OCR on page ${index + 1}/${pages.length}...`);
        const result = await workerInstance.recognize(imageBlob);

        const normalizedText = result.data.text.replace(/\r\n/g, "\n").trim();
        pageResults.push(`--- Page ${pageNumber} ---\n${normalizedText}`);
      }

      const finalText = pageResults.join("\n\n").trim();
      setResultText(finalText);
      setProgressLabel("OCR complete.");
    } catch (error) {
      console.error("PDF OCR failed", error);
      setErrorMessage("OCR failed for this document. Try fewer pages or a different language.");
      setProgressLabel("");
    } finally {
      if (worker) {
        await worker.terminate();
      }
      if (pdfDocument) {
        await pdfDocument.destroy();
      }
      setProcessing(false);
    }
  }

  async function handleCopy() {
    if (!resultText.trim()) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function handleDownloadTxt() {
    if (!file || !resultText.trim()) return;
    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${baseFileName(file.name)}_ocr.txt`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Perform OCR on scanned PDFs in-browser and export searchable text.
        </p>
      </div>

      {!file ? (
        <PdfUploader onUpload={handleUpload} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview
            files={[file]}
            onRemove={() => {
              setFile(null);
              setPageCount(0);
              setPageInput("all");
              setErrorMessage(null);
              setProgressLabel("");
              setResultText("");
              setCopied(false);
            }}
          />

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Pages</label>
                  <span className="text-xs text-[var(--color-text-muted)]">Total: {pageCount || "-"}</span>
                </div>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  placeholder="all or 1-2, 6"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>

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
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Render Quality</label>
              <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                <button
                  onClick={() => setRenderScale(1.5)}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                    renderScale === 1.5
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  Faster (1.5x)
                </button>
                <button
                  onClick={() => setRenderScale(2)}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                    renderScale === 2
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  Better OCR (2x)
                </button>
              </div>
            </div>

            <button
              onClick={handleRunOcr}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
              {processing ? "Running OCR..." : "Extract Text with OCR"}
            </button>

            {progressLabel && <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>}
            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>

          {resultText && (
            <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">OCR Output</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download TXT
                  </button>
                </div>
              </div>

              <textarea
                value={resultText}
                readOnly
                rows={12}
                className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)]"
              />
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
