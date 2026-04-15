import { useState } from "react";
import { Clipboard, Download, LoaderCircle, Type } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, extractPdfText, parsePageRanges } from "@/tools/pdf-utils";

export default function PdfToTxt() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("all");
  const [includePageLabels, setIncludePageLabels] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [resultText, setResultText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function handleExtract() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setProgressLabel("Preparing extraction...");
    setCopied(false);

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const selectedPages = parsePageRanges(pageInput, pageCount);

      if (selectedPages.length === 0) {
        setErrorMessage("Please enter a valid page range.");
        return;
      }

      const pageTexts = await extractPdfText(sourceBytes, selectedPages, (done, total) => {
        setProgressLabel(`Extracting text... ${done}/${total}`);
      });

      const assembled = pageTexts
        .map((text, index) => {
          const pageNumber = selectedPages[index];
          if (!includePageLabels) return text || "";
          return `--- Page ${pageNumber} ---\n${text || ""}`;
        })
        .join("\n\n")
        .trim();

      setResultText(assembled);
      setProgressLabel("Extraction complete.");
    } catch (error) {
      console.error("PDF to text failed", error);
      setErrorMessage("Failed to extract text from this PDF.");
      setProgressLabel("");
    } finally {
      setProcessing(false);
    }
  }

  function handleDownloadTxt() {
    if (!file || !resultText.trim()) return;
    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${baseFileName(file.name)}.txt`);
  }

  async function handleCopy() {
    if (!resultText.trim()) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Extract searchable text from PDF pages without uploading files to a server.
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
              setResultText("");
              setErrorMessage(null);
              setProgressLabel("");
              setPageCount(0);
              setPageInput("all");
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
                  placeholder="all or 1-3, 5"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={includePageLabels}
                    onChange={(event) => setIncludePageLabels(event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border-primary)]"
                  />
                  Include page labels in output
                </label>
              </div>
            </div>

            <button
              onClick={handleExtract}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Type className="h-4 w-4" />}
              {processing ? "Extracting..." : "Extract Text"}
            </button>

            {progressLabel && <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>}
            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>

          {resultText && (
            <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Extracted Text</h3>
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
        </div>
      )}
    </div>
  );
}
