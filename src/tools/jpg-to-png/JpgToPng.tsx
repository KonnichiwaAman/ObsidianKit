import { useRef, useState } from "react";
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
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

interface ConversionResult {
  inputBytes: number;
  outputBytes: number;
}

export default function JpgToPng() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batch = useImageBatchQueue();

  async function convertFile(inputFile: File): Promise<{ blob: Blob; fileName: string }> {
    const canvas = document.createElement("canvas");
    let decoded: Awaited<ReturnType<typeof decodeImageBlob>> | null = null;

    try {
      decoded = await decodeImageBlob(inputFile);
      canvas.width = decoded.width;
      canvas.height = decoded.height;

      const context = getCanvasContext2D(canvas);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const { blob } = await exportCanvasToBlob(canvas, { type: "image/png" });
      return {
        blob,
        fileName: buildOutputName(inputFile.name, "_png", "image/png"),
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
      });
    } catch (error) {
      console.error("JPG to PNG conversion failed", error);
      setError(getErrorMessage(error, "Failed to convert the selected JPG image."));
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
      const exported = await batch.downloadZip("jpg_to_png_batch.zip");
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
        <p className="text-sm text-[var(--color-text-muted)]">
          Convert JPG files to lossless PNG while preserving the full pixel dimensions.
        </p>
      </div>

      {!file ? (
        <ImageUploader onUpload={handleNewFile} accept=".jpg,.jpeg,image/jpeg" />
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
                  <p className="font-medium">PNG conversion complete.</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Original: {formatFileSize(result.inputBytes)} | Output: {formatFileSize(result.outputBytes)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center">
            <button
              onClick={handleConvert}
              disabled={converting || batch.processing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {converting ? "Converting..." : "Convert to PNG & Download"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ImageBatchUploader onUpload={batch.addFiles} accept=".jpg,.jpeg,image/jpeg" maxSizeMB={20} maxFiles={50} />

        <ImageBatchQueue
          title="Batch JPG to PNG"
          runLabel="Convert Queue"
          zipLabel="Download ZIP"
          zipFileName="jpg_to_png_batch.zip"
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
