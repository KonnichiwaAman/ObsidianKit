import { useRef, useState } from "react";
import JSZip from "jszip";
import { ImageIcon, LoaderCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, openPdfWithPdfJs, parsePageRanges } from "@/tools/pdf-utils";

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: "image/png" | "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("all");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(88);
  const [scale, setScale] = useState<1 | 1.5 | 2>(1.5);
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function handleUpload(files: File[]) {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMessage(null);
    setResultMessage(null);
    setProgressLabel("");

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

  async function handleConvert() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const pages = parsePageRanges(pageInput, pageCount);
      if (pages.length === 0) {
        setErrorMessage("Please enter a valid page range.");
        return;
      }

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;

      const pdfDocument = await openPdfWithPdfJs(sourceBytes);

      try {
        const converted: Array<{ name: string; blob: Blob }> = [];

        for (let index = 0; index < pages.length; index += 1) {
          const pageNumber = pages[index];
          setProgressLabel(`Rendering page ${index + 1}/${pages.length}...`);

          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale });

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

          const mimeType = format === "png" ? "image/png" : "image/jpeg";
          const blob = await canvasToBlob(canvas, mimeType, format === "png" ? 1 : quality / 100);
          if (!blob) {
            throw new Error(`Failed to encode page ${pageNumber}.`);
          }

          converted.push({
            name: `${baseFileName(file.name)}_page-${String(pageNumber).padStart(2, "0")}.${format}`,
            blob,
          });
        }

        if (converted.length === 1) {
          downloadBlob(converted[0].blob, converted[0].name);
          setResultMessage("1 page exported successfully.");
        } else {
          setProgressLabel("Preparing ZIP package...");
          const zip = new JSZip();
          for (const image of converted) {
            zip.file(image.name, image.blob);
          }

          const zipBlob = await zip.generateAsync({ type: "blob" });
          downloadBlob(zipBlob, `${baseFileName(file.name)}_images.zip`);
          setResultMessage(`${converted.length} pages exported and packaged as ZIP.`);
        }
      } finally {
        await pdfDocument.destroy();
      }

      setProgressLabel("");
    } catch (error) {
      console.error("PDF to image failed", error);
      setErrorMessage("Failed to convert this PDF to images.");
      setProgressLabel("");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Convert selected PDF pages to PNG or JPG in your browser, with no upload required.
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
              setResultMessage(null);
              setProgressLabel("");
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
                  placeholder="all or 1-3, 7"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Image Format</label>
                <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                  <button
                    onClick={() => setFormat("png")}
                    className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                      format === "png"
                        ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => setFormat("jpg")}
                    className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                      format === "jpg"
                        ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    JPG
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Render Scale</label>
                <select
                  value={scale}
                  onChange={(event) => setScale(Number(event.target.value) as 1 | 1.5 | 2)}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value={1}>1x (faster)</option>
                  <option value={1.5}>1.5x (balanced)</option>
                  <option value={2}>2x (higher quality)</option>
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">JPG Quality</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  disabled={format === "png"}
                  className="w-full accent-[var(--color-text-primary)] disabled:opacity-40"
                />
              </div>
            </div>

            <button
              onClick={handleConvert}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {processing ? "Converting..." : "Convert & Download"}
            </button>

            {progressLabel && <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>}
            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
            {resultMessage && <p className="text-xs text-emerald-400">{resultMessage}</p>}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
