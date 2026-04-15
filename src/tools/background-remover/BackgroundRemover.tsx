import { useEffect, useRef, useState } from "react";
import { preload, removeBackground, type Config } from "@imgly/background-removal";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eraser,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { ImageUploader, ImagePreview } from "@/components/ui/ImageUploader";
import { ImageBatchUploader } from "@/components/ui/ImageBatchUploader";
import { ImageBatchQueue } from "@/components/ui/ImageBatchQueue";
import {
  buildOutputName,
  downloadBlob,
  formatFileSize,
  getErrorMessage,
  type ExportImageType,
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

type RemovalMode = "ai" | "manual";
type QualityMode = "fast" | "balanced" | "best";
type DeviceMode = "cpu" | "gpu";
type ManualTool = "erase" | "restore";

interface RemovalResult {
  blob: Blob;
  fileName: string;
  durationSeconds: number;
}

const MODEL_BY_QUALITY: Record<QualityMode, Config["model"]> = {
  fast: "isnet_quint8",
  balanced: "isnet_fp16",
  best: "isnet",
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image for manual editing."));
    };

    image.src = objectUrl;
  });
}

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [removalMode, setRemovalMode] = useState<RemovalMode>("ai");
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("gpu");
  const [manualTool, setManualTool] = useState<ManualTool>("erase");
  const [brushSize, setBrushSize] = useState("36");
  const [outputFormat, setOutputFormat] = useState<ExportImageType>("image/png");
  const [outputQuality, setOutputQuality] = useState("0.92");
  const [preloading, setPreloading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualCanvasReady, setManualCanvasReady] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RemovalResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);

  const manualCanvasRef = useRef<HTMLCanvasElement>(null);
  const manualBaseImageRef = useRef<HTMLImageElement | null>(null);
  const manualDrawingRef = useRef(false);
  const manualLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const batch = useImageBatchQueue();

  useEffect(() => {
    if (!result) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(result.blob);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [result]);

  useEffect(() => {
    if (!file || removalMode !== "manual") {
      setManualCanvasReady(false);
      manualBaseImageRef.current = null;
      manualLastPointRef.current = null;
      manualDrawingRef.current = false;
      return;
    }

    let cancelled = false;
    setManualCanvasReady(false);
    setError(null);
    setProgressLabel("Preparing manual editor...");

    const prepare = async () => {
      try {
        const loadedImage = await loadImageFromFile(file);
        if (cancelled) return;

        const canvas = manualCanvasRef.current;
        if (!canvas) return;

        const maxEdge = 1800;
        const sourceWidth = loadedImage.naturalWidth || loadedImage.width;
        const sourceHeight = loadedImage.naturalHeight || loadedImage.height;
        const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          throw new Error("Canvas context unavailable for manual editing.");
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(loadedImage, 0, 0, width, height);

        manualBaseImageRef.current = loadedImage;
        setManualCanvasReady(true);
        setProgressLabel("Manual editor ready. Use Erase and Restore to refine cutout edges.");
      } catch (error) {
        if (cancelled) return;
        setError(getErrorMessage(error, "Failed to initialize manual editor."));
        setProgressLabel("");
      }
    };

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [file, removalMode]);

  function getOutputQuality(): number {
    if (outputFormat === "image/png") return 1;

    const parsed = Number.parseFloat(outputQuality);
    return clampNumber(Number.isFinite(parsed) ? parsed : 0.92, 0.5, 1);
  }

  function getBrushRadius(): number {
    const parsed = Number.parseFloat(brushSize);
    return clampNumber(Number.isFinite(parsed) ? parsed : 36, 4, 220) / 2;
  }

  function buildConfig(progressCallback?: (label: string) => void): Config {
    return {
      model: MODEL_BY_QUALITY[qualityMode],
      device: deviceMode,
      output: {
        format: outputFormat,
        quality: getOutputQuality(),
      },
      progress: (key, current, total) => {
        if (!progressCallback) return;
        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        progressCallback(`${key} ${percent}%`);
      },
    };
  }

  async function runRemoval(inputFile: File, progressCallback?: (label: string) => void): Promise<RemovalResult> {
    const start = performance.now();
    const blob = await removeBackground(inputFile, buildConfig(progressCallback));
    const durationSeconds = (performance.now() - start) / 1000;

    return {
      blob,
      durationSeconds,
      fileName: buildOutputName(inputFile.name, "_no-bg", outputFormat),
    };
  }

  function stampManualBrush(x: number, y: number) {
    const canvas = manualCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const radius = getBrushRadius();

    if (manualTool === "erase") {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "#000";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
      return;
    }

    const baseImage = manualBaseImageRef.current;
    if (!baseImage) return;

    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();
    context.globalCompositeOperation = "source-over";
    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function paintBetweenPoints(from: { x: number; y: number }, to: { x: number; y: number }) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const stepSize = Math.max(1, getBrushRadius() / 2.5);
    const steps = Math.max(1, Math.ceil(distance / stepSize));

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      stampManualBrush(x, y);
    }
  }

  function getPointerCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function handleManualPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!manualCanvasReady || processing) return;

    const point = getPointerCanvasPoint(event);
    manualDrawingRef.current = true;
    manualLastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    stampManualBrush(point.x, point.y);
  }

  function handleManualPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!manualDrawingRef.current) return;

    const point = getPointerCanvasPoint(event);
    const lastPoint = manualLastPointRef.current;

    if (lastPoint) {
      paintBetweenPoints(lastPoint, point);
    } else {
      stampManualBrush(point.x, point.y);
    }

    manualLastPointRef.current = point;
  }

  function stopManualDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    manualDrawingRef.current = false;
    manualLastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resetManualEdits() {
    const canvas = manualCanvasRef.current;
    const baseImage = manualBaseImageRef.current;
    if (!canvas || !baseImage) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    setProgressLabel("Manual edits reset to original image.");
  }

  async function runManualExport(inputFile: File): Promise<RemovalResult> {
    const canvas = manualCanvasRef.current;
    if (!canvas || !manualCanvasReady) {
      throw new Error("Manual editor is not ready yet.");
    }

    const start = performance.now();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error("Failed to export manual background removal result."));
            return;
          }
          resolve(nextBlob);
        },
        outputFormat,
        getOutputQuality(),
      );
    });

    return {
      blob,
      durationSeconds: (performance.now() - start) / 1000,
      fileName: buildOutputName(inputFile.name, "_manual-no-bg", outputFormat),
    };
  }

  async function handlePreload() {
    if (removalMode !== "ai") {
      setProgressLabel("Preload is available in AI mode only.");
      return;
    }

    setPreloading(true);
    setError(null);
    setProgressLabel("Preparing AI model cache...");

    try {
      await preload(
        buildConfig((label) => {
          setProgressLabel(`Preloading: ${label}`);
        }),
      );
      setProgressLabel("Model preloaded and cached for faster next runs.");
    } catch (error) {
      setError(getErrorMessage(error, "Failed to preload model assets."));
      setProgressLabel("");
    } finally {
      setPreloading(false);
    }
  }

  async function handleSingleRun() {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgressLabel("Starting background removal...");

    try {
      const nextResult = removalMode === "manual"
        ? await runManualExport(file)
        : await runRemoval(file, (label) => {
            setProgressLabel(`Downloading model data: ${label}`);
          });

      setResult(nextResult);
      setProgressLabel(removalMode === "manual" ? "Manual cutout exported successfully." : "Background removed successfully.");
    } catch (error) {
      console.error("Background removal failed", error);
      setError(getErrorMessage(error, "Failed to remove background from this image."));
      setProgressLabel("");
    } finally {
      setProcessing(false);
    }
  }

  function handleDownloadResult() {
    if (!result) return;
    downloadBlob(result.blob, result.fileName);
  }

  async function handleBatchRun() {
    if (removalMode !== "ai") {
      setBatchInfo("Batch queue currently supports AI mode only. Switch to AI mode to process multiple files.");
      return;
    }

    setBatchInfo(null);

    await batch.runBatch(async (inputFile, context) => {
      const nextResult = await runRemoval(inputFile, (label) => {
        batch.setProgressLabel(`File ${context.index + 1}/${context.total}: ${label}`);
      });

      return {
        blob: nextResult.blob,
        fileName: nextResult.fileName,
        note: `${nextResult.durationSeconds.toFixed(1)}s`,
      };
    });
  }

  async function handleDownloadBatchZip() {
    try {
      const exported = await batch.downloadZip("background_removed_images.zip");
      setBatchInfo(`${exported} image(s) exported as ZIP.`);
    } catch (error) {
      setBatchInfo(getErrorMessage(error, "ZIP export failed."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Remove image backgrounds locally in your browser with AI or manual brush controls. No server upload required.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Removal Mode</label>
            <select
              value={removalMode}
              onChange={(event) => {
                const nextMode = event.target.value as RemovalMode;
                setRemovalMode(nextMode);
                setError(null);
                setResult(null);
                setBatchInfo(null);
              }}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="ai">AI (automatic)</option>
              <option value="manual">Manual brush mode</option>
            </select>
          </div>

          {removalMode === "ai" ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">AI Quality Mode</label>
                <select
                  value={qualityMode}
                  onChange={(event) => setQualityMode(event.target.value as QualityMode)}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="fast">Fast (small model)</option>
                  <option value="balanced">Balanced (recommended)</option>
                  <option value="best">Best quality (largest model)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Execution Device</label>
                <select
                  value={deviceMode}
                  onChange={(event) => setDeviceMode(event.target.value as DeviceMode)}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="gpu">GPU (faster when available)</option>
                  <option value="cpu">CPU (highest compatibility)</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Manual Tool</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualTool("erase")}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    manualTool === "erase"
                      ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  Erase
                </button>
                <button
                  type="button"
                  onClick={() => setManualTool("restore")}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    manualTool === "restore"
                      ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  Restore
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output Format</label>
            <select
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value as ExportImageType)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="image/png">PNG (transparent background)</option>
              <option value="image/webp">WebP</option>
              <option value="image/jpeg">JPG</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Output Quality</label>
              <span className="text-xs text-[var(--color-text-primary)]">
                {Math.round(getOutputQuality() * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.02"
              value={outputQuality}
              onChange={(event) => setOutputQuality(event.target.value)}
              disabled={outputFormat === "image/png"}
              className="w-full accent-[var(--color-text-primary)] disabled:opacity-40"
            />
          </div>

          {removalMode === "manual" && (
            <div className="md:col-span-2 space-y-3 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Brush Size</label>
                <span className="text-xs text-[var(--color-text-primary)]">{Math.round(clampNumber(parseFloat(brushSize) || 36, 4, 220))} px</span>
              </div>
              <input
                type="range"
                min="4"
                max="220"
                step="1"
                value={brushSize}
                onChange={(event) => setBrushSize(event.target.value)}
                className="w-full accent-[var(--color-text-primary)]"
              />
              <button
                type="button"
                onClick={resetManualEdits}
                disabled={!manualCanvasReady || processing}
                className="inline-flex items-center rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              >
                Reset Manual Edits
              </button>
            </div>
          )}
        </div>

        {removalMode === "ai" ? (
          <>
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 text-xs text-[var(--color-text-muted)]">
              First run downloads model assets and caches them locally. Higher quality modes may download more data.
            </div>

            <button
              onClick={handlePreload}
              disabled={preloading || processing || batch.processing}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {preloading ? "Preloading..." : "Preload Model Assets"}
            </button>
          </>
        ) : (
          <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 text-xs text-[var(--color-text-muted)]">
            Manual mode lets you erase and restore with brush control. Keep output format as PNG for transparency-safe exports.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {!file ? (
            <ImageUploader onUpload={setFile} accept="image/*" maxSizeMB={25} />
          ) : (
            <ImagePreview
              file={file}
              onClear={() => {
                setFile(null);
                setError(null);
                setResult(null);
                setManualCanvasReady(false);
                manualBaseImageRef.current = null;
                setProgressLabel("");
              }}
            />
          )}

          {file && removalMode === "manual" && (
            <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Manual Editor</h4>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Tool: {manualTool === "erase" ? "Erase" : "Restore"}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-2">
                <canvas
                  ref={manualCanvasRef}
                  onPointerDown={handleManualPointerDown}
                  onPointerMove={handleManualPointerMove}
                  onPointerUp={stopManualDrawing}
                  onPointerCancel={stopManualDrawing}
                  onPointerLeave={stopManualDrawing}
                  className="h-auto max-h-[420px] w-full touch-none rounded-lg bg-[var(--color-bg-card)] cursor-crosshair"
                />
              </div>

              {!manualCanvasReady && (
                <p className="text-xs text-[var(--color-text-muted)]">Initializing manual editing canvas...</p>
              )}
            </div>
          )}

          <button
            onClick={handleSingleRun}
            disabled={
              !file
              || processing
              || preloading
              || batch.processing
              || (removalMode === "manual" && !manualCanvasReady)
            }
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            {processing
              ? (removalMode === "manual" ? "Exporting Manual Cutout..." : "Removing Background...")
              : (removalMode === "manual" ? "Export Manual Cutout" : "Remove Background")}
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Output Preview</h3>

          {previewUrl ? (
            <div className="space-y-3">
              <div className="h-72 overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)]">
                <img src={previewUrl} alt="Background removed preview" className="h-full w-full object-contain" />
              </div>

              {result && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  <p>Output size: {formatFileSize(result.blob.size)}</p>
                  {result.durationSeconds > 0 && <p>Processing time: {result.durationSeconds.toFixed(1)}s</p>}
                </div>
              )}

              <button
                onClick={handleDownloadResult}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              >
                <Download className="h-4 w-4" />
                Download Result
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Run background removal to preview and download the processed image.
            </p>
          )}

          {progressLabel && (
            <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
              {progressLabel}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {result && !error && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{removalMode === "manual" ? "Manual cutout exported successfully." : "Background removal completed successfully."}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {removalMode !== "ai" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Batch processing currently runs in AI mode only. Switch to AI mode to process queues and export ZIP files.
          </div>
        )}

        <ImageBatchUploader onUpload={batch.addFiles} accept="image/*" maxSizeMB={25} maxFiles={40} />

        <ImageBatchQueue
          title="Batch Background Removal"
          runLabel="Run Background Removal"
          zipLabel="Download ZIP"
          zipFileName="background_removed_images.zip"
          items={batch.items}
          processing={batch.processing}
          progressLabel={batch.progressLabel}
          onRun={handleBatchRun}
          onRequeue={batch.requeueAll}
          onDownloadZip={handleDownloadBatchZip}
          onDownloadItem={batch.downloadItem}
          onRemoveItem={batch.removeItem}
          onClear={batch.clearAll}
        />

        {batchInfo && (
          <p className="text-xs text-[var(--color-text-secondary)]">{batchInfo}</p>
        )}
      </div>
    </div>
  );
}
