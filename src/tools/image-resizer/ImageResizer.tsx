import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Lock, Unlock } from "lucide-react";
import { ImageUploader, ImagePreview } from "@/components/ui/ImageUploader";
import { ImageBatchUploader } from "@/components/ui/ImageBatchUploader";
import { ImageBatchQueue } from "@/components/ui/ImageBatchQueue";
import {
  buildOutputName,
  decodeImageBlob,
  downloadBlob,
  exportCanvasToBlob,
  getCanvasContext2D,
  getErrorMessage,
  type DecodedImage,
  type ExportImageType,
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

type OutputFormat = "original" | ExportImageType;

interface ResizeResult {
  outputType: ExportImageType;
}

const PRESETS = [
  { label: "16:9 Landscape", width: 1920, height: 1080 },
  { label: "9:16 Portrait", width: 1080, height: 1920 },
  { label: "Square", width: 1080, height: 1080 },
  { label: "Instagram Post", width: 1080, height: 1080 },
  { label: "Instagram Portrait", width: 1080, height: 1350 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Passport (2x2 in)", width: 600, height: 600 },
  { label: "A4 (300 DPI)", width: 2480, height: 3508 },
  { label: "A5 (300 DPI)", width: 1748, height: 2480 },
  { label: "Letter (300 DPI)", width: 2550, height: 3300 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
];

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

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState("0.9");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResizeResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);

  const sourceRef = useRef<DecodedImage | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batch = useImageBatchQueue();

  const aspectRatio = useMemo(() => {
    if (sourceWidth <= 0 || sourceHeight <= 0) return 1;
    return sourceWidth / sourceHeight;
  }, [sourceWidth, sourceHeight]);

  useEffect(() => {
    let cancelled = false;

    async function loadSource() {
      if (!file) {
        sourceRef.current?.close();
        sourceRef.current = null;
        setSourceWidth(0);
        setSourceHeight(0);
        setWidth(0);
        setHeight(0);
        return;
      }

      try {
        sourceRef.current?.close();
        sourceRef.current = null;

        const decoded = await decodeImageBlob(file);
        if (cancelled) {
          decoded.close();
          return;
        }

        sourceRef.current = decoded;
        setSourceWidth(decoded.width);
        setSourceHeight(decoded.height);
        setWidth(decoded.width);
        setHeight(decoded.height);
      } catch (error) {
        if (cancelled) return;
        setError(getErrorMessage(error, "Unable to read dimensions for this image."));
      }
    }

    void loadSource();

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  function handleWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const w = parseInt(e.target.value) || 0;
    setWidth(w);
    if (maintainRatio && w > 0) {
      setHeight(Math.round(w / aspectRatio));
    }
  }

  function handleHeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const h = parseInt(e.target.value) || 0;
    setHeight(h);
    if (maintainRatio && h > 0) {
      setWidth(Math.round(h * aspectRatio));
    }
  }

  function applyPreset(nextWidth: number, nextHeight: number) {
    setWidth(nextWidth);
    setHeight(nextHeight);
  }

  async function resizeFile(inputFile: File): Promise<{ blob: Blob; type: ExportImageType; fileName: string }> {
    if (width <= 0 || height <= 0) {
      throw new Error("Enter valid width and height values before processing.");
    }

    let decoded: Awaited<ReturnType<typeof decodeImageBlob>> | null = null;
    const canvas = document.createElement("canvas");

    try {
      decoded = await decodeImageBlob(inputFile);
      canvas.width = width;
      canvas.height = height;
      const context = getCanvasContext2D(canvas);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const targetType = resolveExportType(inputFile, outputFormat);
      if (targetType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(decoded.source, 0, 0, width, height);

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: targetType,
        quality: targetType === "image/png" ? undefined : parseFloat(quality),
        fallbackType: getFallbackType(targetType),
      });

      return {
        blob,
        type,
        fileName: buildOutputName(inputFile.name, `_${width}x${height}`, type),
      };
    } finally {
      decoded?.close();
    }
  }

  async function handleResize() {
    if (!file || !sourceRef.current || !canvasRef.current || width <= 0 || height <= 0) return;

    setError(null);
    setResult(null);
    setConverting(true);

    try {
      const resized = await resizeFile(file);
      downloadBlob(resized.blob, resized.fileName);
      setResult({ outputType: resized.type });
    } catch (error) {
      console.error("Resize failed", error);
      setError(getErrorMessage(error, "Failed to resize this image."));
    } finally {
      setConverting(false);
    }
  }

  async function handleBatchRun() {
    setBatchInfo(null);

    await batch.runBatch(async (inputFile) => {
      const resized = await resizeFile(inputFile);
      return {
        blob: resized.blob,
        fileName: resized.fileName,
      };
    });
  }

  async function handleDownloadZip() {
    try {
      const exported = await batch.downloadZip("image_resizer_batch.zip");
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
        <p className="text-sm text-[var(--color-text-muted)]">Resize images to specific pixel dimensions while optionally maintaining aspect ratio.</p>
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
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-4">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                Source: {sourceWidth} x {sourceHeight} px
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
               
               <div className="w-full flex-1">
                  <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Width (px)</label>
                  <input
                     type="number"
                     value={width || ""}
                     onChange={handleWidthChange}
                     min="1"
                     className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                  />
               </div>

               <button
                  onClick={() => setMaintainRatio(!maintainRatio)}
                  className={`mt-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                     maintainRatio
                        ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                  }`}
                  title={maintainRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
               >
                  {maintainRatio ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
               </button>

               <div className="w-full flex-1">
                  <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Height (px)</label>
                  <input
                     type="number"
                     value={height || ""}
                     onChange={handleHeightChange}
                     min="1"
                     className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                  />
               </div>

            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Quick presets</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.width, preset.height)}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="mb-2 flex justify-between">
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
                    <p className="font-medium">Resize complete.</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Exported format: {result.outputType.replace("image/", "").toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <button
                onClick={handleResize}
                disabled={converting || batch.processing || width <= 0 || height <= 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {converting ? "Processing..." : "Resize & Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ImageBatchUploader onUpload={batch.addFiles} accept="image/*" maxSizeMB={20} maxFiles={50} />

        <ImageBatchQueue
          title="Batch Image Resizer"
          runLabel="Resize Queue"
          zipLabel="Download ZIP"
          zipFileName="image_resizer_batch.zip"
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
