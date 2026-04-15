import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ShieldCheck } from "lucide-react";
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

type OutputFormat = "original" | ExportImageType;

interface ExifResult {
  inputBytes: number;
  outputBytes: number;
  exportedType: ExportImageType;
}

function resolveExportType(file: File, selectedFormat: OutputFormat): ExportImageType {
  if (selectedFormat !== "original") return selectedFormat;
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function getFallbackType(type: ExportImageType): ExportImageType | undefined {
  if (type === "image/webp") return "image/jpeg";
  if (type === "image/jpeg") return "image/png";
  return undefined;
}

export default function ExifRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState("0.95");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExifResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batch = useImageBatchQueue();

  async function convertFile(inputFile: File): Promise<{ blob: Blob; outputType: ExportImageType; fileName: string }> {
    const canvas = document.createElement("canvas");
    let decoded: Awaited<ReturnType<typeof decodeImageBlob>> | null = null;

    try {
      decoded = await decodeImageBlob(inputFile);
      canvas.width = decoded.width;
      canvas.height = decoded.height;

      const context = getCanvasContext2D(canvas);
      context.clearRect(0, 0, canvas.width, canvas.height);

      const targetType = resolveExportType(inputFile, outputFormat);
      if (targetType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: targetType,
        quality: targetType === "image/png" ? undefined : parseFloat(quality),
        fallbackType: getFallbackType(targetType),
      });

      return {
        blob,
        outputType: type,
        fileName: buildOutputName(inputFile.name, "_cleaned", type),
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
        exportedType: converted.outputType,
      });
    } catch (error) {
      console.error("EXIF stripping failed", error);
      setError(getErrorMessage(error, "Failed to strip metadata from this image."));
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
      };
    });
  }

  async function handleDownloadZip() {
    try {
      const exported = await batch.downloadZip("exif_removed_batch.zip");
      setBatchInfo(`${exported} image(s) exported as ZIP.`);
    } catch (error) {
      setBatchInfo(getErrorMessage(error, "ZIP export failed."));
    }
  }

  function handleNewFile(nextFile: File) {
    setFile(nextFile);
    setError(null);
    setResult(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Remove all EXIF meta information including GPS locations, camera models, and dates to protect your privacy.</p>
      </div>

      {!file ? (
        <ImageUploader onUpload={handleNewFile} accept="image/*" />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <ImagePreview
            file={file}
            onClear={() => {
              setFile(null);
              setError(null);
              setResult(null);
            }}
          />
          
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4 text-center">
             <div className="flex justify-center mb-2">
                <div className="rounded-full bg-green-500/20 p-3">
                   <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
             </div>
             <p className="text-sm font-medium text-[var(--color-text-primary)]">Ready to strip metadata</p>
             <p className="text-xs text-[var(--color-text-muted)]">Processing creates a new metadata-free image with no GPS, camera, or capture timestamps.</p>

             <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output format</label>
                  <select
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                    className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                  >
                    <option value="original">Keep source format</option>
                    <option value="image/jpeg">JPG</option>
                    <option value="image/png">PNG</option>
                    <option value="image/webp">WebP</option>
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">Quality</label>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {Math.round(parseFloat(quality) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.02"
                    value={quality}
                    onChange={(event) => setQuality(event.target.value)}
                    className="w-full accent-[var(--color-text-primary)]"
                  />
                </div>
             </div>

             {error && (
               <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                 <div className="flex items-start gap-2">
                   <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                   <span>{error}</span>
                 </div>
               </div>
             )}

             {result && (
               <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-left text-sm text-emerald-400">
                 <div className="flex items-start gap-2">
                   <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                   <div>
                     <p className="font-medium">Metadata removed successfully.</p>
                     <p className="text-xs text-[var(--color-text-secondary)]">
                       Original: {formatFileSize(result.inputBytes)} | Output: {formatFileSize(result.outputBytes)}
                     </p>
                     <p className="text-xs text-[var(--color-text-secondary)]">
                       Exported format: {result.exportedType.replace("image/", "").toUpperCase()}
                     </p>
                   </div>
                 </div>
               </div>
             )}
             
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleConvert}
                disabled={converting || batch.processing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {converting ? "Scrubbing..." : "Remove EXIF & Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ImageBatchUploader onUpload={batch.addFiles} accept="image/*" maxSizeMB={20} maxFiles={50} />

        <ImageBatchQueue
          title="Batch EXIF Remover"
          runLabel="Remove Metadata"
          zipLabel="Download ZIP"
          zipFileName="exif_removed_batch.zip"
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
