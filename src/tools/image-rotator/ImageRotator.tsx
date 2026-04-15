import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
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

type OutputFormat = "original" | ExportImageType;

interface RotateResult {
  outputType: ExportImageType;
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

function getTransformedSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  return {
    width: Math.max(1, Math.round(width * cos + height * sin)),
    height: Math.max(1, Math.round(width * sin + height * cos)),
  };
}

export default function ImageRotator() {
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0); // in degrees
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState("0.9");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RotateResult | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<DecodedImage | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawTransformed = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      source: DecodedImage,
      options?: { previewMaxSize?: number; backgroundColor?: string },
    ): { width: number; height: number } => {
      const transformed = getTransformedSize(source.width, source.height, rotation);
      const { previewMaxSize, backgroundColor } = options ?? {};
      let scale = 1;

      if (previewMaxSize) {
        scale = Math.min(1, previewMaxSize / transformed.width, previewMaxSize / transformed.height);
      }

      const canvas = ctx.canvas;
      canvas.width = Math.max(1, Math.round(transformed.width * scale));
      canvas.height = Math.max(1, Math.round(transformed.height * scale));

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, transformed.width, transformed.height);

      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, transformed.width, transformed.height);
      }

      ctx.save();
      ctx.translate(transformed.width / 2, transformed.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(source.source, -source.width / 2, -source.height / 2, source.width, source.height);
      ctx.restore();

      return transformed;
    },
    [flipH, flipV, rotation],
  );

  const renderPreview = useCallback(() => {
    if (!previewCanvasRef.current || !sourceRef.current) return;
    const context = previewCanvasRef.current.getContext("2d");
    if (!context) return;
    drawTransformed(context, sourceRef.current, { previewMaxSize: 420 });
  }, [drawTransformed]);

  useEffect(() => {
    let cancelled = false;

    async function loadSource() {
      if (!file) {
        sourceRef.current?.close();
        sourceRef.current = null;
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
        renderPreview();
      } catch (error) {
        if (cancelled) return;
        setError(getErrorMessage(error, "Could not load the selected image for editing."));
      }
    }

    void loadSource();

    return () => {
      cancelled = true;
    };
  }, [file, renderPreview]);

  useEffect(() => {
    if (sourceRef.current) {
      renderPreview();
    }
  }, [renderPreview]);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  async function handleDownload() {
    if (!file || !sourceRef.current || !canvasRef.current) return;

    setError(null);
    setResult(null);
    setConverting(true);

    try {
      const canvas = canvasRef.current;
      const context = getCanvasContext2D(canvas);

      const targetType = resolveExportType(file, outputFormat);
      drawTransformed(context, sourceRef.current, {
        backgroundColor: targetType === "image/jpeg" ? "#ffffff" : undefined,
      });

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: targetType,
        quality: targetType === "image/png" ? undefined : parseFloat(quality),
        fallbackType: getFallbackType(targetType),
      });

      downloadBlob(blob, buildOutputName(file.name, "_edited", type));
      setResult({ outputType: type });
    } catch (error) {
      console.error("Transform failed", error);
      setError(getErrorMessage(error, "Failed to export the transformed image."));
    } finally {
      setConverting(false);
    }
  }

  function reset() {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setResult(null);
    setError(null);
  }

  function handleNewFile(nextFile: File) {
    setFile(nextFile);
    reset();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Rotate and flip images quickly entirely in your browser.</p>
      </div>

      {!file ? (
        <ImageUploader onUpload={handleNewFile} accept="image/*" />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-6 min-h-[300px]">
            <canvas ref={previewCanvasRef} className="max-w-full max-h-[400px] object-contain shadow-lg" />
          </div>
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
               <button
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] py-4 text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
               >
                  <RotateCcw className="h-5 w-5" />
                  <span className="text-xs font-medium">Left -90°</span>
               </button>
               <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] py-4 text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
               >
                  <RotateCw className="h-5 w-5" />
                  <span className="text-xs font-medium">Right +90°</span>
               </button>
               <button
                  onClick={() => setFlipH(!flipH)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border transition-all py-4 ${flipH ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"}`}
               >
                  <FlipHorizontal className="h-5 w-5" />
                  <span className="text-xs font-medium">Flip H</span>
               </button>
               <button
                  onClick={() => setFlipV(!flipV)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border transition-all py-4 ${flipV ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"}`}
               >
                  <FlipVertical className="h-5 w-5" />
                  <span className="text-xs font-medium">Flip V</span>
               </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Angle</label>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{Math.round(rotation)}deg</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) => setRotation(parseInt(event.target.value, 10) || 0)}
                className="w-full accent-[var(--color-text-primary)]"
              />
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
                    <p className="font-medium">Image updated successfully.</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Exported format: {result.outputType.replace("image/", "").toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => { setFile(null); reset(); }}
                className="flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              >
                 Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={converting || (rotation === 0 && !flipH && !flipV)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-4 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {converting ? "Processing..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
