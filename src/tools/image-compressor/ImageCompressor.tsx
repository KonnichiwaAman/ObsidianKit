import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Minimize } from "lucide-react";
import imageCompression from "browser-image-compression";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImageBatchUploader } from "@/components/ui/ImageBatchUploader";
import { ImageBatchQueue } from "@/components/ui/ImageBatchQueue";
import {
  buildOutputName,
  clamp,
  decodeImageBlob,
  downloadBlob,
  exportCanvasToBlob,
  formatFileSize,
  getCanvasContext2D,
  getErrorMessage,
  type ExportImageType,
} from "@/tools/image-utils";
import { useImageBatchQueue } from "@/hooks/useImageBatchQueue";

type CompressionOutput = "auto" | ExportImageType;
type SizeUnit = "KB" | "MB";
type TargetMode = "balanced" | "strict";
type CompressionStrategy = "quality-first" | "size-limit";

interface CompressionResult {
  outputFile: File;
  outputType: string;
  usedOriginalFallback: boolean;
  metTargetSize: boolean;
  targetSizeBytes: number;
  savedPercent: number;
  selectedQuality: number;
  selectedDimension: number;
  attempts: number;
  targetMode: TargetMode;
  strategy: CompressionStrategy;
}

interface CompressionCandidate {
  file: File;
  quality: number;
  dimension: number;
}

function toBytes(value: number, unit: SizeUnit): number {
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value * 1024 * 1024);
}

function toMaxSizeMB(value: number, unit: SizeUnit): number {
  if (unit === "KB") return value / 1024;
  return value;
}

function padFileToExactSize(file: File, targetBytes: number): File {
  if (file.size >= targetBytes) return file;
  const padding = new Uint8Array(targetBytes - file.size);
  return new File([file, padding], file.name, { type: file.type });
}

function buildQualityCandidates(minQuality: number, mode: TargetMode): number[] {
  const base = mode === "strict"
    ? [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56, 0.52, 0.48, 0.44, 0.4, 0.36, 0.32, 0.28, 0.24, 0.2]
    : [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56, 0.52, 0.48, 0.44, 0.4];

  const candidates = base.filter((quality) => quality >= minQuality - 0.0001);
  if (!candidates.includes(minQuality)) {
    candidates.push(minQuality);
  }

  const unique = Array.from(new Set(candidates.map((value) => Number(value.toFixed(3)))));
  unique.sort((a, b) => b - a);
  return unique;
}

function buildDimensionCandidates(maxDimension: number, mode: TargetMode): number[] {
  const factors = mode === "strict"
    ? [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36]
    : [1, 0.92, 0.84, 0.76, 0.68, 0.6];

  const values = factors.map((factor) => Math.max(256, Math.round(maxDimension * factor)));
  return Array.from(new Set(values));
}

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<CompressionStrategy>("quality-first");
  const [targetSizeValue, setTargetSizeValue] = useState("1");
  const [targetSizeUnit, setTargetSizeUnit] = useState<SizeUnit>("MB");
  const [targetMode, setTargetMode] = useState<TargetMode>("balanced");
  const [qualityFloor, setQualityFloor] = useState("0.7");
  const [maxDimension, setMaxDimension] = useState("2560");
  const [batchInputLimitValue, setBatchInputLimitValue] = useState("20");
  const [batchInputLimitUnit, setBatchInputLimitUnit] = useState<SizeUnit>("MB");
  const [outputFormat, setOutputFormat] = useState<CompressionOutput>("auto");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [batchInfo, setBatchInfo] = useState<string | null>(null);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });

  const batch = useImageBatchQueue();
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const normalizedBatchLimit = useMemo(() => {
    const parsed = parseFloat(batchInputLimitValue);
    return batchInputLimitUnit === "KB"
      ? clamp(parsed || 20480, 50, 102400)
      : clamp(parsed || 20, 0.5, 200);
  }, [batchInputLimitUnit, batchInputLimitValue]);

  const batchInputLimitBytes = useMemo(
    () => toBytes(normalizedBatchLimit, batchInputLimitUnit),
    [batchInputLimitUnit, normalizedBatchLimit],
  );

  function resetResultState() {
    setError(null);
    setResult(null);
  }

  function getTargetSizeConfig(): { targetBytes: number } {
    const parsed = parseFloat(targetSizeValue);
    const normalizedValue = targetSizeUnit === "KB"
      ? clamp(parsed || 512, 50, 102400)
      : clamp(parsed || 1, 0.1, 100);

    return {
      targetBytes: toBytes(normalizedValue, targetSizeUnit),
    };
  }

  function clampCrop(next: { x: number; y: number; width: number; height: number }) {
    const width = clamp(next.width, 3, 100);
    const height = clamp(next.height, 3, 100);
    const x = clamp(next.x, 0, 100 - width);
    const y = clamp(next.y, 0, 100 - height);
    setCropRect({ x, y, width, height });
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropEnabled || !cropContainerRef.current) return;

    const rect = cropContainerRef.current.getBoundingClientRect();
    const startX = ((event.clientX - rect.left) / rect.width) * 100;
    const startY = ((event.clientY - rect.top) / rect.height) * 100;

    setSelectionStart({ x: startX, y: startY });
    setIsSelecting(true);
    clampCrop({ x: startX, y: startY, width: 0.1, height: 0.1 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isSelecting || !cropContainerRef.current) return;

    const rect = cropContainerRef.current.getBoundingClientRect();
    const currentX = ((event.clientX - rect.left) / rect.width) * 100;
    const currentY = ((event.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(selectionStart.x, currentX);
    const y = Math.min(selectionStart.y, currentY);
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);

    clampCrop({ x, y, width, height });
  }

  function handleCropPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isSelecting) return;
    setIsSelecting(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function maybeCropInputFile(inputFile: File): Promise<File> {
    if (!cropEnabled) return inputFile;

    const decoded = await decodeImageBlob(inputFile);
    const canvas = document.createElement("canvas");

    try {
      const cropPx = {
        x: Math.round((cropRect.x / 100) * decoded.width),
        y: Math.round((cropRect.y / 100) * decoded.height),
        width: Math.max(1, Math.round((cropRect.width / 100) * decoded.width)),
        height: Math.max(1, Math.round((cropRect.height / 100) * decoded.height)),
      };

      canvas.width = cropPx.width;
      canvas.height = cropPx.height;
      const context = getCanvasContext2D(canvas);
      context.drawImage(
        decoded.source,
        cropPx.x,
        cropPx.y,
        cropPx.width,
        cropPx.height,
        0,
        0,
        cropPx.width,
        cropPx.height,
      );

      const inputType: ExportImageType = inputFile.type === "image/png"
        ? "image/png"
        : inputFile.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: inputType,
        quality: inputType === "image/png" ? undefined : 0.98,
        fallbackType: inputType === "image/webp" ? "image/jpeg" : undefined,
      });

      return new File([blob], buildOutputName(inputFile.name, "_cropped_source", type), { type });
    } finally {
      decoded.close();
    }
  }

  async function runCompressionAttempt(
    inputFile: File,
    quality: number,
    dimension: number,
  ): Promise<File> {
    const compressed = await imageCompression(inputFile, {
      maxWidthOrHeight: dimension,
      initialQuality: quality,
      alwaysKeepResolution: false,
      preserveExif: false,
      fileType: outputFormat === "auto" ? undefined : outputFormat,
      useWebWorker: true,
      maxIteration: 1,
    });

    return compressed;
  }

  async function compressFile(inputFile: File): Promise<{
    outputFile: File;
    outputType: string;
    usedOriginalFallback: boolean;
    metTargetSize: boolean;
    targetSizeBytes: number;
    savedPercent: number;
    selectedQuality: number;
    selectedDimension: number;
    attempts: number;
    fileName: string;
    targetMode: TargetMode;
    strategy: CompressionStrategy;
  }> {
    const { targetBytes } = getTargetSizeConfig();
    const configuredMinQuality = clamp(parseFloat(qualityFloor) || 0.7, 0.2, 1);
    const minAllowedQuality = strategy === "size-limit" ? 0.02 : configuredMinQuality;
    const targetMaxDimension = Math.round(clamp(parseFloat(maxDimension) || 2560, 320, 8192));

    const candidateQualities = buildQualityCandidates(configuredMinQuality, targetMode);
    const candidateDimensions = strategy === "size-limit"
      ? Array.from(
          new Set([
            ...buildDimensionCandidates(targetMaxDimension, "strict"),
            Math.max(192, Math.round(targetMaxDimension * 0.28)),
            Math.max(128, Math.round(targetMaxDimension * 0.2)),
            96,
            64,
          ]),
        ).sort((a, b) => b - a)
      : buildDimensionCandidates(targetMaxDimension, targetMode);

    let bestMeeting: CompressionCandidate | null = null;
    let bestSmallest: CompressionCandidate | null = null;
    let attempts = 0;
    const sizeLimitMeetings: CompressionCandidate[] = [];

    if (strategy === "size-limit") {
      for (const dimension of candidateDimensions) {
        let low = minAllowedQuality;
        let high = 1;

        for (let pass = 0; pass < 11; pass += 1) {
          const quality = Number(((low + high) / 2).toFixed(3));
          attempts += 1;

          const compressed = await runCompressionAttempt(inputFile, quality, dimension);
          const candidate: CompressionCandidate = { file: compressed, quality, dimension };

          if (!bestSmallest || compressed.size < bestSmallest.file.size) {
            bestSmallest = candidate;
          }

          if (compressed.size <= targetBytes) {
            sizeLimitMeetings.push(candidate);
            low = Math.min(1, quality + 0.01);
          } else {
            high = Math.max(minAllowedQuality, quality - 0.01);
          }

          if (Math.abs(high - low) < 0.005) break;
        }
      }

      if (sizeLimitMeetings.length === 0 || (bestSmallest && bestSmallest.file.size > targetBytes)) {
        const emergencyDimensions = Array.from(
          new Set([
            Math.min(targetMaxDimension, 256),
            192,
            160,
            128,
            96,
            64,
          ]),
        ).sort((a, b) => b - a);
        const emergencyQualities = [0.2, 0.14, 0.1, 0.07, 0.05, 0.03, 0.02];

        for (const dimension of emergencyDimensions) {
          for (const quality of emergencyQualities) {
            attempts += 1;

            const compressed = await runCompressionAttempt(inputFile, quality, dimension);
            const candidate: CompressionCandidate = { file: compressed, quality, dimension };

            if (!bestSmallest || compressed.size < bestSmallest.file.size) {
              bestSmallest = candidate;
            }

            if (compressed.size <= targetBytes) {
              sizeLimitMeetings.push(candidate);
            }
          }
        }
      }

      if (sizeLimitMeetings.length > 0) {
        bestMeeting = sizeLimitMeetings.reduce((closest, current) => {
          return current.file.size > closest.file.size ? current : closest;
        }, sizeLimitMeetings[0]);
      }
    } else {
      for (const dimension of candidateDimensions) {
        for (const quality of candidateQualities) {
          attempts += 1;

          const compressed = await runCompressionAttempt(inputFile, quality, dimension);
          const candidate: CompressionCandidate = { file: compressed, quality, dimension };

          if (!bestSmallest || compressed.size < bestSmallest.file.size) {
            bestSmallest = candidate;
          }

          if (compressed.size <= targetBytes) {
            bestMeeting = candidate;
            break;
          }
        }

        if (bestMeeting) break;
      }
    }

    const selected = bestMeeting ?? bestSmallest;
    if (!selected) {
      throw new Error("Unable to compress this image.");
    }

    if (strategy === "size-limit" && selected.file.size > targetBytes) {
      throw new Error(
        `Exact target of ${formatFileSize(targetBytes)} is not achievable for this image in-browser. Try a higher cap or a more compressible output format.`,
      );
    }

    const shouldFallbackToOriginal = strategy === "quality-first"
      ? selected.file.size >= inputFile.size
      : false;

    let outputFile = shouldFallbackToOriginal ? inputFile : selected.file;
    if (strategy === "size-limit" && outputFile.size <= targetBytes) {
      outputFile = padFileToExactSize(outputFile, targetBytes);
    }

    const outputType = outputFile.type || inputFile.type || "image/jpeg";
    const metTargetSize = strategy === "size-limit"
      ? outputFile.size === targetBytes
      : outputFile.size <= targetBytes;
    const savedPercent = Math.max(0, Math.round((1 - outputFile.size / inputFile.size) * 100));
    const suffix = shouldFallbackToOriginal
      ? "_original"
      : strategy === "size-limit"
        ? "_capped"
        : "_compressed";

    return {
      outputFile,
      outputType,
      usedOriginalFallback: shouldFallbackToOriginal,
      metTargetSize,
      targetSizeBytes: targetBytes,
      savedPercent,
      selectedQuality: selected.quality,
      selectedDimension: selected.dimension,
      attempts,
      fileName: buildOutputName(inputFile.name, suffix, outputType),
      targetMode,
      strategy,
    };
  }

  async function handleCompress() {
    if (!file) return;

    resetResultState();
    setConverting(true);

    try {
      const preparedFile = await maybeCropInputFile(file);
      const compressed = await compressFile(preparedFile);

      setResult({
        outputFile: compressed.outputFile,
        outputType: compressed.outputType,
        usedOriginalFallback: compressed.usedOriginalFallback,
        metTargetSize: compressed.metTargetSize,
        targetSizeBytes: compressed.targetSizeBytes,
        savedPercent: compressed.savedPercent,
        selectedQuality: compressed.selectedQuality,
        selectedDimension: compressed.selectedDimension,
        attempts: compressed.attempts,
        targetMode: compressed.targetMode,
        strategy: compressed.strategy,
      });
    } catch (error) {
      console.error("Compression failed", error);
      setError(getErrorMessage(error, "Failed to compress this image."));
    } finally {
      setConverting(false);
    }
  }

  function handleDownload() {
    if (!file || !result) return;

    const suffix = result.usedOriginalFallback
      ? "_original"
      : result.strategy === "size-limit"
        ? "_capped"
        : "_compressed";
    downloadBlob(result.outputFile, buildOutputName(file.name, suffix, result.outputType));
  }

  async function handleBatchRun() {
    setBatchInfo(null);

    await batch.runBatch(async (inputFile) => {
      if (inputFile.size > batchInputLimitBytes) {
        throw new Error(`File exceeds current batch input limit (${formatFileSize(batchInputLimitBytes)}).`);
      }

      const compressed = await compressFile(inputFile);
      return {
        blob: compressed.outputFile,
        fileName: compressed.fileName,
        note: compressed.usedOriginalFallback
          ? "Compressed output larger than input; original kept"
          : compressed.metTargetSize
            ? compressed.strategy === "size-limit"
              ? `Exact target cap met (${formatFileSize(compressed.targetSizeBytes)})`
              : `Target met (${Math.round(compressed.selectedQuality * 100)}% quality, ${compressed.selectedDimension}px max edge, quality-first mode)`
            : `Target ${formatFileSize(compressed.targetSizeBytes)} not fully reached (${compressed.strategy === "size-limit" ? "size-limit" : "quality-first"} mode)`,
        metrics: {
          inputBytes: inputFile.size,
          outputBytes: compressed.outputFile.size,
          savedPercent: compressed.savedPercent,
        },
      };
    });
  }

  async function handleDownloadZip() {
    try {
      const exported = await batch.downloadZip("image_compression_batch.zip");
      setBatchInfo(`${exported} image(s) exported as ZIP.`);
    } catch (error) {
      setBatchInfo(getErrorMessage(error, "ZIP export failed."));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Reduce image size with a shared strict pipeline used by both single and batch compression.</p>
      </div>

      {!file ? (
        <ImageUploader
          onUpload={(nextFile) => {
            setFile(nextFile);
            setCropEnabled(false);
            setCropRect({ x: 10, y: 10, width: 80, height: 80 });
            resetResultState();
          }}
          accept="image/*"
        />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setCropEnabled(false);
                resetResultState();
              }}
              className="absolute right-4 top-4 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Remove
            </button>

            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              {file.name} · {formatFileSize(file.size)}
            </p>

            <div
              ref={cropContainerRef}
              className={`relative overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] ${cropEnabled ? "cursor-crosshair" : ""}`}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="block max-h-[320px] w-full object-contain" />
              ) : (
                <div className="flex h-[240px] items-center justify-center text-xs text-[var(--color-text-muted)]">Preview unavailable</div>
              )}

              {cropEnabled && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-black/40" />
                  <div
                    className="pointer-events-none absolute z-10 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{
                      left: `${cropRect.x}%`,
                      top: `${cropRect.y}%`,
                      width: `${cropRect.width}%`,
                      height: `${cropRect.height}%`,
                    }}
                  />
                </>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={cropEnabled}
                  onChange={(event) => setCropEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
                Crop freehand before compressing
              </label>

              {cropEnabled && (
                <button
                  type="button"
                  onClick={() => setCropRect({ x: 10, y: 10, width: 80, height: 80 })}
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Reset Crop
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
            {!result && (
              <>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Compression strategy</label>
                  <select
                    value={strategy}
                    onChange={(event) => setStrategy(event.target.value as CompressionStrategy)}
                    className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                  >
                    <option value="quality-first">Quality-first (existing mode)</option>
                    <option value="size-limit">Target-size limit (hard cap mode)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Target output size (single + batch)</label>
                    <input
                      type="number"
                      min={targetSizeUnit === "KB" ? 50 : 0.1}
                      step={targetSizeUnit === "KB" ? 50 : 0.1}
                      value={targetSizeValue}
                      onChange={(event) => setTargetSizeValue(event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Size Unit</label>
                    <select
                      value={targetSizeUnit}
                      onChange={(event) => setTargetSizeUnit(event.target.value as SizeUnit)}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Adherence Mode</label>
                    <select
                      value={targetMode}
                      onChange={(event) => setTargetMode(event.target.value as TargetMode)}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    >
                      <option value="balanced">Balanced (fewer passes)</option>
                      <option value="strict">Strict (more aggressive search)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output Format</label>
                    <select
                      value={outputFormat}
                      onChange={(event) => setOutputFormat(event.target.value as CompressionOutput)}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    >
                      <option value="auto">Keep source format</option>
                      <option value="image/jpeg">JPG</option>
                      <option value="image/webp">WebP</option>
                      <option value="image/png">PNG</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">Minimum allowed quality</label>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {Math.round((parseFloat(qualityFloor) || 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.02"
                    value={qualityFloor}
                    onChange={(event) => setQualityFloor(event.target.value)}
                    className="w-full accent-[var(--color-text-primary)]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">Max Dimension</label>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{maxDimension}px</span>
                  </div>
                  <input
                    type="range"
                    min="320"
                    max="4096"
                    step="16"
                    value={maxDimension}
                    onChange={(event) => setMaxDimension(event.target.value)}
                    className="w-full accent-[var(--color-text-primary)]"
                  />
                </div>
              </>
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
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-start gap-2 text-green-500">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Compression complete</p>
                    <p className="text-xs text-[var(--color-text-primary)]">
                      Original: {formatFileSize(file.size)} | Output: {formatFileSize(result.outputFile.size)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {result.usedOriginalFallback
                        ? "Compressed output was larger than original, so the original file is preserved."
                        : `Reduced by ${result.savedPercent}% in ${result.attempts} attempt(s).`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Target: {formatFileSize(result.targetSizeBytes)} | Selected quality: {Math.round(result.selectedQuality * 100)}% | Max edge: {result.selectedDimension}px | Mode: {result.targetMode} | Strategy: {result.strategy === "size-limit" ? "size-limit" : "quality-first"}
                    </p>
                    {result.strategy === "size-limit" && result.metTargetSize && (
                      <p className="mt-1 text-xs text-emerald-400">Exact cap matched: {formatFileSize(result.targetSizeBytes)}</p>
                    )}
                    {!result.usedOriginalFallback && !result.metTargetSize && (
                      <p className="mt-1 text-xs text-amber-400">
                        Target size could not be fully reached with current format, quality floor, and dimension constraints.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              {!result ? (
                <button
                  onClick={handleCompress}
                  disabled={converting || batch.processing}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minimize className="h-4 w-4" />
                  {converting ? "Compressing..." : "Start Compression"}
                </button>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setFile(null);
                      resetResultState();
                    }}
                    className="flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    Compress Another
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-4 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Batch upload file-size limit</label>
              <input
                type="number"
                min={batchInputLimitUnit === "KB" ? 50 : 0.5}
                step={batchInputLimitUnit === "KB" ? 50 : 0.5}
                value={batchInputLimitValue}
                onChange={(event) => setBatchInputLimitValue(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Batch limit unit</label>
              <select
                value={batchInputLimitUnit}
                onChange={(event) => setBatchInputLimitUnit(event.target.value as SizeUnit)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            Batch queue and single compression use the same output target above. Files larger than {normalizedBatchLimit} {batchInputLimitUnit} will be rejected at queue time and re-checked at run time.
          </p>
        </div>

        <ImageBatchUploader
          onUpload={batch.addFiles}
          accept="image/*"
          maxSizeMB={toMaxSizeMB(normalizedBatchLimit, batchInputLimitUnit)}
          maxFiles={50}
          title="Batch Compression"
        />

        <ImageBatchQueue
          title="Batch Image Compressor"
          runLabel="Compress Queue"
          zipLabel="Download ZIP"
          zipFileName="image_compression_batch.zip"
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
