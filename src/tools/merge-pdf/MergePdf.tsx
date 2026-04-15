import { useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Download, Repeat2, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader } from "@/components/ui/PdfUploader";
import { downloadBlob, formatBytes, toArrayBuffer } from "@/tools/pdf-utils";

type PageSizeMode = "normalize-first" | "preserve-source" | "normalize-a4";
type FitMode = "contain" | "cover";

const A4_SIZE = { width: 595.28, height: 841.89 };

function calculatePlacement(
  source: { width: number; height: number },
  target: { width: number; height: number },
  fitMode: FitMode,
) {
  const widthRatio = target.width / Math.max(1, source.width);
  const heightRatio = target.height / Math.max(1, source.height);
  const scale = fitMode === "cover" ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);

  const width = source.width * scale;
  const height = source.height * scale;

  return {
    x: (target.width - width) / 2,
    y: (target.height - height) / 2,
    width,
    height,
  };
}

export default function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [insertPosition, setInsertPosition] = useState<"start" | "end">("end");
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("normalize-first");
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [skipUnreadable, setSkipUnreadable] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function handleUpload(newFiles: File[]) {
    setErrorMessage(null);

    setFiles((prev) => {
      const combined = insertPosition === "start" ? [...newFiles, ...prev] : [...prev, ...newFiles];

      // Keep the first instance of each file to avoid accidental duplicates from repeated upload clicks.
      const deduped: File[] = [];
      const seen = new Set<string>();
      for (const file of combined) {
        const key = `${file.name}::${file.size}::${file.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(file);
      }

      return deduped;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFile(fromIndex: number, toIndex: number) {
    setFiles((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      if (fromIndex === toIndex) return prev;

      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  const totalInputSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  async function handleMerge() {
    if (files.length < 2) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setWarnings([]);

    try {
      const mergedPdf = await PDFDocument.create();
      const skipped: string[] = [];
      let mergedSources = 0;
      let baselinePageSize: { width: number; height: number } | null = null;

      for (const file of files) {
        try {
          const sourceBytes = new Uint8Array(await file.arrayBuffer());
          const sourcePdf = await PDFDocument.load(sourceBytes);
          const sourcePageIndices = sourcePdf.getPageIndices();

          if (sourcePageIndices.length === 0) {
            skipped.push(`Skipped ${file.name} because it has no pages.`);
            continue;
          }

          if (pageSizeMode === "preserve-source") {
            const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePageIndices);
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          } else {
            if (pageSizeMode === "normalize-first" && !baselinePageSize) {
              const firstSourcePage = sourcePdf.getPage(sourcePageIndices[0]);
              const firstSize = firstSourcePage.getSize();
              baselinePageSize = {
                width: firstSize.width,
                height: firstSize.height,
              };
            }

            const targetPageSize = pageSizeMode === "normalize-a4"
              ? A4_SIZE
              : baselinePageSize ?? A4_SIZE;

            const embeddedPages = await mergedPdf.embedPdf(sourceBytes, sourcePageIndices);

            for (let index = 0; index < embeddedPages.length; index += 1) {
              const sourcePage = sourcePdf.getPage(sourcePageIndices[index]);
              const sourceSize = sourcePage.getSize();

              const outputPage = mergedPdf.addPage([targetPageSize.width, targetPageSize.height]);
              const placement = calculatePlacement(sourceSize, targetPageSize, fitMode);

              outputPage.drawPage(embeddedPages[index], placement);
            }
          }

          mergedSources += 1;
        } catch (error) {
          if (!skipUnreadable) {
            const reason = error instanceof Error ? error.message : "Unsupported PDF format.";
            throw new Error(`Failed on "${file.name}": ${reason}`);
          }
          skipped.push(`Skipped ${file.name} because it appears encrypted or invalid.`);
        }
      }

      if (mergedPdf.getPageCount() === 0) {
        throw new Error("No readable PDFs were available to merge.");
      }

      const pdfBytes = await mergedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      downloadBlob(blob, `merged-${mergedSources}-files-${stamp}.pdf`);

      setWarnings(skipped);
    } catch (error) {
      console.error("Merge failed", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to merge the selected files.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Upload multiple PDFs, arrange them with precise order controls, and merge into one output.
        </p>
      </div>

      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <PdfUploader onUpload={handleUpload} multiple={true} />

        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Workflow Settings</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Control how new uploads are inserted and how unreadable files are handled.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">Add new files:</span>
              <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                <button
                  onClick={() => setInsertPosition("start")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    insertPosition === "start"
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  At Start
                </button>
                <button
                  onClick={() => setInsertPosition("end")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    insertPosition === "end"
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  At End
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Page Size Strategy</label>
              <select
                value={pageSizeMode}
                onChange={(event) => setPageSizeMode(event.target.value as PageSizeMode)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
              >
                <option value="normalize-first">Normalize to first file pages (recommended)</option>
                <option value="preserve-source">Preserve original page sizes</option>
                <option value="normalize-a4">Normalize all pages to A4</option>
              </select>
            </div>

            {pageSizeMode !== "preserve-source" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Content Fit</label>
                <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                  <button
                    onClick={() => setFitMode("contain")}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      fitMode === "contain"
                        ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Contain
                  </button>
                  <button
                    onClick={() => setFitMode("cover")}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      fitMode === "cover"
                        ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Cover
                  </button>
                </div>
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={skipUnreadable}
              onChange={(event) => setSkipUnreadable(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-primary)] bg-[var(--color-bg-input)]"
            />
            Skip encrypted/corrupted files instead of failing the entire merge.
          </label>

          {pageSizeMode !== "preserve-source" && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Normalized merge keeps a consistent page canvas across all sources so pages do not look unexpectedly larger or smaller between documents.
            </p>
          )}
        </div>

        {files.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5 relative">
            <button
              onClick={() => setFiles([])}
              className="absolute right-4 top-4 text-xs font-medium text-red-500 hover:text-red-600"
            >
              Clear All
            </button>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pr-20">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Merge Order</h3>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span>{files.length} file{files.length === 1 ? "" : "s"}</span>
                <span>•</span>
                <span>{formatBytes(totalInputSize)}</span>
                <button
                  onClick={() => setFiles((prev) => [...prev].reverse())}
                  className="ml-2 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-2 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <Repeat2 className="h-3.5 w-3.5" />
                  Reverse
                </button>
              </div>
            </div>

            <div className="grid gap-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file, index) => {
                const canMoveUp = index > 0;
                const canMoveDown = index < files.length - 1;

                return (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {index + 1}. {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{formatBytes(file.size)}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => moveFile(index, 0)}
                          disabled={!canMoveUp}
                          title="Move to start"
                          className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                        >
                          <ChevronsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveFile(index, index - 1)}
                          disabled={!canMoveUp}
                          title="Move up"
                          className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveFile(index, index + 1)}
                          disabled={!canMoveDown}
                          title="Move down"
                          className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveFile(index, files.length - 1)}
                          disabled={!canMoveDown}
                          title="Move to end"
                          className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                        >
                          <ChevronsDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeFile(index)}
                          title="Remove"
                          className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1.5 text-red-500 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={handleMerge}
            disabled={processing || files.length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            {processing ? "Merging..." : `Merge ${files.length} PDF${files.length !== 1 ? "s" : ""} & Download`}
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 inline-flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-300">Merge completed with warnings</p>
            <div className="max-h-32 overflow-y-auto pr-1 custom-scrollbar space-y-1">
              {warnings.map((warning) => (
                <p key={warning} className="text-xs text-amber-200/90">{warning}</p>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && files.length < 2 && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">Please upload at least 2 files to merge.</p>
        )}
      </div>
    </div>
  );
}
