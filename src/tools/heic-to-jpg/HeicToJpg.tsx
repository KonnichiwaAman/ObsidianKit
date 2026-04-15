import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { ImageUploader, ImagePreview } from "@/components/ui/ImageUploader";
import { ImageBatchUploader } from "@/components/ui/ImageBatchUploader";
import { ImageBatchQueue } from "@/components/ui/ImageBatchQueue";
import {
  buildOutputName,
  downloadBlob,
  formatFileSize,
  getErrorMessage,
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

interface ConversionResult {
  outputBytes: number;
  frameCount: number;
}

type Heic2AnyFn = typeof import("heic2any").default;

let heic2AnyPromise: Promise<Heic2AnyFn> | null = null;

async function getHeic2Any(): Promise<Heic2AnyFn> {
  if (!heic2AnyPromise) {
    heic2AnyPromise = import("heic2any").then((module) => module.default);
  }
  return heic2AnyPromise;
}

export default function HeicToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [quality, setQuality] = useState("0.9");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);

  const batch = useImageBatchQueue();

  async function convertFile(inputFile: File): Promise<{ blob: Blob; fileName: string; frameCount: number }> {
    const heic2any = await getHeic2Any();
    const conversionResult = await heic2any({
      blob: inputFile,
      toType: "image/jpeg",
      quality: parseFloat(quality),
    });

    const blobs = (Array.isArray(conversionResult) ? conversionResult : [conversionResult]).filter(
      (item): item is Blob => item instanceof Blob,
    );

    if (blobs.length === 0) {
      throw new Error("No convertible image frame was found in this HEIC file.");
    }

    const finalBlob = blobs.reduce((largest, current) =>
      current.size > largest.size ? current : largest,
    );

    return {
      blob: finalBlob,
      fileName: buildOutputName(inputFile.name, "_converted", "image/jpeg"),
      frameCount: blobs.length,
    };
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
        outputBytes: converted.blob.size,
        frameCount: converted.frameCount,
      });
    } catch (error) {
      console.error("HEIC conversion failed", error);
      setError(getErrorMessage(error, "Failed to convert HEIC image. The file might be unsupported or corrupted."));
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
          converted.frameCount > 1
            ? `Selected largest frame from ${converted.frameCount} frames`
            : undefined,
      };
    });
  }

  async function handleDownloadZip() {
    try {
      const exported = await batch.downloadZip("heic_to_jpg_batch.zip");
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
        <p className="text-sm text-[var(--color-text-muted)]">Convert Apple HEIC photos to universally supported JPG format.</p>
      </div>

      {!file ? (
        <ImageUploader onUpload={handleNewFile} accept=".heic,.heif,image/heic,image/heif" />
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

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">JPG Quality</label>
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
                    <p className="font-medium">HEIC conversion complete.</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Output size: {formatFileSize(result.outputBytes)}
                    </p>
                    {result.frameCount > 1 && (
                      <p className="text-xs text-amber-400">
                        Multiple frames detected. Downloaded the largest frame for best quality.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleConvert}
              disabled={converting || batch.processing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {converting ? "Converting HEIC..." : "Convert to JPG & Download"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ImageBatchUploader
          onUpload={batch.addFiles}
          accept=".heic,.heif,image/heic,image/heif"
          maxSizeMB={30}
          maxFiles={40}
        />

        <ImageBatchQueue
          title="Batch HEIC to JPG"
          runLabel="Convert Queue"
          zipLabel="Download ZIP"
          zipFileName="heic_to_jpg_batch.zip"
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
    </div>
  );
}
