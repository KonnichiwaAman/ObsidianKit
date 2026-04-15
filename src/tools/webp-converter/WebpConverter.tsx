import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { ImageUploader, ImagePreview } from "@/components/ui/ImageUploader";
import { ImageBatchUploader } from "@/components/ui/ImageBatchUploader";
import { ImageBatchQueue } from "@/components/ui/ImageBatchQueue";
import {
  buildOutputName,
  decodeImageBlob,
  downloadBlob,
  exportCanvasToBlob,
  formatFileSize,
  getCanvasContext2D,
  getErrorMessage,
  type ExportImageType,
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

interface ConversionResult {
  inputBytes: number;
  outputBytes: number;
  requestedType: ExportImageType;
  exportedType: ExportImageType;
}

const FORMAT_OPTIONS: { value: ExportImageType; label: string }[] = [
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/png", label: "PNG" },
];

function getFallbackType(type: ExportImageType): ExportImageType | undefined {
  if (type === "image/webp") return "image/jpeg";
  if (type === "image/jpeg") return "image/png";
  return undefined;
}

export default function WebpConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<ExportImageType>("image/webp");
  const [quality, setQuality] = useState("0.8");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batch = useImageBatchQueue();

  const isInputWebp = file?.type === "image/webp";

  useEffect(() => {
    if (!file) return;
    setTargetFormat(file.type === "image/webp" ? "image/jpeg" : "image/webp");
    setResult(null);
    setError(null);
  }, [file]);

  async function convertFile(inputFile: File): Promise<{
    blob: Blob;
    requestedType: ExportImageType;
    exportedType: ExportImageType;
    fileName: string;
  }> {
    const canvas = document.createElement("canvas");
    let decoded: Awaited<ReturnType<typeof decodeImageBlob>> | null = null;

    try {
      decoded = await decodeImageBlob(inputFile);
      canvas.width = decoded.width;
      canvas.height = decoded.height;

      const context = getCanvasContext2D(canvas);
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (targetFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: targetFormat,
        quality: targetFormat === "image/png" ? undefined : parseFloat(quality),
        fallbackType: getFallbackType(targetFormat),
      });

      return {
        blob,
        requestedType: targetFormat,
        exportedType: type,
        fileName: buildOutputName(inputFile.name, "_converted", type),
      };
    } finally {
      decoded?.close();
    }
  }

  async function handleConvert() {
    if (!file) return;

    setError(null);
    setResult(null);
    setConverting(true);

    try {
      const converted = await convertFile(file);
      downloadBlob(converted.blob, converted.fileName);
      setResult({
        inputBytes: file.size,
        outputBytes: converted.blob.size,
        requestedType: converted.requestedType,
        exportedType: converted.exportedType,
      });
    } catch (error) {
      console.error("WebP conversion failed", error);
      setError(getErrorMessage(error, "Failed to convert this image in your browser."));
    } finally {
      setConverting(false);
    }
  }

  async function handleBatchRun() {
    setBatchInfo(null);

    await batch.runBatch(async (inputFile) => {
      const converted = await convertFile(inputFile);
      return {
        blob: converted.blob,
        fileName: converted.fileName,
        note:
          converted.requestedType !== converted.exportedType
            ? `Fallback: ${converted.exportedType.replace("image/", "").toUpperCase()}`
            : undefined,
      };
    });
  }

  async function handleDownloadZip() {
    try {
      const exported = await batch.downloadZip("webp_converter_batch.zip");
      setBatchInfo(`${exported} image(s) exported as ZIP.`);
    } catch (error) {
      setBatchInfo(getErrorMessage(error, "ZIP export failed."));
    }
  }

  function handleNewFile(nextFile: File) {
    setFile(nextFile);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Convert images to and from the highly optimized WebP format.</p>
      </div>

      {!file ? (
         <ImageUploader onUpload={handleNewFile} accept="image/*" />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <ImagePreview
            file={file}
            onClear={() => {
              setFile(null);
              setResult(null);
              setError(null);
            }}
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
            <div>
              <label className="mb-3 block text-xs font-medium text-[var(--color-text-secondary)]">Target Format</label>
              <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                 {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setTargetFormat(fmt.value)}
                      className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                        targetFormat === fmt.value
                          ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)] shadow-sm"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
                      }`}
                    >
                       {fmt.label}
                    </button>
                 ))}
              </div>
              {isInputWebp && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Input is already WebP. Re-encoding can improve compatibility or reduce size.
                </p>
              )}
            </div>

            {(targetFormat === "image/webp" || targetFormat === "image/jpeg") && (
              <div>
                <div className="flex justify-between mb-2">
                   <label className="text-xs font-medium text-[var(--color-text-secondary)]">Quality</label>
                   <span className="text-xs text-[var(--color-text-primary)] font-medium">{Math.round(parseFloat(quality) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Conversion complete.</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Original: {formatFileSize(result.inputBytes)} | Output: {formatFileSize(result.outputBytes)}
                    </p>
                    {result.requestedType !== result.exportedType && (
                      <p className="text-xs text-amber-400">
                        Browser fallback applied: exported as {result.exportedType.replace("image/", "").toUpperCase()}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <button
                onClick={handleConvert}
                disabled={converting || batch.processing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {converting ? "Converting..." : "Convert & Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ImageBatchUploader onUpload={batch.addFiles} accept="image/*" maxSizeMB={20} maxFiles={50} />

        <ImageBatchQueue
          title="Batch WebP Converter"
          runLabel="Convert Queue"
          zipLabel="Download ZIP"
          zipFileName="webp_converter_batch.zip"
          items={batch.items}
          processing={batch.processing}
          progressLabel={batch.progressLabel}
          onRun={handleBatchRun}
          onRequeue={batch.requeueAll}
          onDownloadZip={handleDownloadZip}
          onDownloadItem={batch.downloadItem}
          onRemoveItem={batch.removeItem}
          onClear={batch.clearAll}
        />

        {batchInfo && <p className="text-xs text-[var(--color-text-secondary)]">{batchInfo}</p>}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
