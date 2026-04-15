import { useState, useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Crop as CropIcon } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  buildOutputName,
  clamp,
  decodeImageBlob,
  downloadBlob,
  exportCanvasToBlob,
  getCanvasContext2D,
  getErrorMessage,
  type DecodedImage,
  type ExportImageType,
} from "@/tools/image-utils";

type OutputFormat = "original" | ExportImageType;

interface CropResult {
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

export default function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState("0.9");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CropResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<DecodedImage | null>(null);

  // Crop box state
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // percentages
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!file) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setImgSrc("");
      return;
    }

    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);

    setImgSrc(objectUrl);
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    setError(null);
    setResult(null);

    const loadDecodedImage = async () => {
      try {
        sourceRef.current?.close();
        sourceRef.current = null;

        const decoded = await decodeImageBlob(file);
        if (cancelled) {
          decoded.close();
          return;
        }

        sourceRef.current = decoded;
      } catch (error) {
        if (cancelled) return;
        setError(getErrorMessage(error, "Could not load this image for cropping."));
      }
    };

    void loadDecodedImage();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  function setCropWithinBounds(nextCrop: { x: number; y: number; width: number; height: number }) {
    const width = clamp(nextCrop.width, 5, 100);
    const height = clamp(nextCrop.height, 5, 100);
    const x = clamp(nextCrop.x, 0, 100 - width);
    const y = clamp(nextCrop.y, 0, 100 - height);
    setCrop({ x, y, width, height });
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...crop });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

    setCropWithinBounds({
      x: cropStart.x + dx,
      y: cropStart.y + dy,
      width: cropStart.width,
      height: cropStart.height,
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  async function handleDownload() {
    if (!file || !sourceRef.current || !canvasRef.current) return;

    setError(null);
    setResult(null);
    setConverting(true);

    try {
      const canvas = canvasRef.current;
      const context = getCanvasContext2D(canvas);

      const cropPx = {
        x: Math.round((crop.x / 100) * sourceRef.current.width),
        y: Math.round((crop.y / 100) * sourceRef.current.height),
        width: Math.max(1, Math.round((crop.width / 100) * sourceRef.current.width)),
        height: Math.max(1, Math.round((crop.height / 100) * sourceRef.current.height)),
      };

      canvas.width = cropPx.width;
      canvas.height = cropPx.height;

      const targetType = resolveExportType(file, outputFormat);
      if (targetType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(
        sourceRef.current.source,
        cropPx.x,
        cropPx.y,
        cropPx.width,
        cropPx.height,
        0,
        0,
        cropPx.width,
        cropPx.height,
      );

      const { blob, type } = await exportCanvasToBlob(canvas, {
        type: targetType,
        quality: targetType === "image/png" ? undefined : parseFloat(quality),
        fallbackType: getFallbackType(targetType),
      });

      downloadBlob(blob, buildOutputName(file.name, "_cropped", type));
      setResult({ outputType: type });
    } catch (error) {
      console.error("Crop failed", error);
      setError(getErrorMessage(error, "Failed to crop this image."));
    } finally {
      setConverting(false);
    }
  }

  // Predefined Aspect Ratios
  function setAspectRatio(ratio: number | null) {
      if (!ratio) {
         setCropWithinBounds({ x: 10, y: 10, width: 80, height: 80 });
         return;
      }
      if (!sourceRef.current) return;

      const imgRatio = sourceRef.current.width / sourceRef.current.height;
      let newWidth = 80;
      let newHeight = 80;

      // Calculate width/height percentages to match the requested aspect ratio *displayed*
      // This is a simplification; for a perfect UI this would be combined with drag handles.
      if (ratio > imgRatio) {
          // Wider than image
          newWidth = 80;
          newHeight = (80 / ratio) * imgRatio;
      } else {
          // Taller than image
          newHeight = 80;
          newWidth = (80 * ratio) / imgRatio;
      }

        setCropWithinBounds({
          x: (100 - newWidth) / 2,
          y: (100 - newHeight) / 2,
          width: newWidth,
          height: newHeight
      });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Crop images visually. Drag the box to select the area you want to keep.</p>
      </div>

      {!file ? (
        <ImageUploader
          onUpload={(nextFile) => {
            setFile(nextFile);
            setError(null);
            setResult(null);
          }}
          accept="image/*"
        />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Work Area */}
          <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-6">
             <div ref={containerRef} className="relative inline-block overflow-hidden rounded shadow-xl" style={{ maxHeight: '60vh' }}>
                <img 
                   src={imgSrc} 
                   alt="To crop" 
                   className="block max-w-full max-h-[60vh] object-contain pointer-events-none" 
                />
                
                {/* Crop Overlay */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                
                {/* Crop Box */}
                <div 
                   onPointerDown={handlePointerDown}
                   onPointerMove={handlePointerMove}
                   onPointerUp={handlePointerUp}
                   onPointerCancel={handlePointerUp}
                   style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                   }}
                   className="absolute border-2 border-white bg-transparent pointer-events-auto cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] outline outline-1 outline-white/50 z-10"
                >
                   {/* Grid lines */}
                   <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-white" />
                      <div className="border-r border-white" />
                      <div className="" />
                   </div>
                </div>
             </div>
          </div>
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
            
            <div className="flex gap-2 pb-4 border-b border-[var(--color-border-primary)] overflow-x-auto scro">
                <button onClick={() => setAspectRatio(null)} className="px-3 py-1.5 rounded bg-[var(--color-bg-primary)] text-xs border border-[var(--color-border-primary)] whitespace-nowrap">Free</button>
                <button onClick={() => setAspectRatio(1)} className="px-3 py-1.5 rounded bg-[var(--color-bg-primary)] text-xs border border-[var(--color-border-primary)] whitespace-nowrap">1:1 Square</button>
                <button onClick={() => setAspectRatio(16/9)} className="px-3 py-1.5 rounded bg-[var(--color-bg-primary)] text-xs border border-[var(--color-border-primary)] whitespace-nowrap">16:9 Landscape</button>
                <button onClick={() => setAspectRatio(9/16)} className="px-3 py-1.5 rounded bg-[var(--color-bg-primary)] text-xs border border-[var(--color-border-primary)] whitespace-nowrap">9:16 Portrait</button>
                <button onClick={() => setAspectRatio(4/3)} className="px-3 py-1.5 rounded bg-[var(--color-bg-primary)] text-xs border border-[var(--color-border-primary)] whitespace-nowrap">4:3</button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Crop X</label>
                  <span className="text-xs text-[var(--color-text-primary)]">{Math.round(crop.x)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, Math.floor(100 - crop.width))}
                  step="1"
                  value={crop.x}
                  onChange={(event) =>
                    setCropWithinBounds({
                      ...crop,
                      x: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Crop Y</label>
                  <span className="text-xs text-[var(--color-text-primary)]">{Math.round(crop.y)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, Math.floor(100 - crop.height))}
                  step="1"
                  value={crop.y}
                  onChange={(event) =>
                    setCropWithinBounds({
                      ...crop,
                      y: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Crop Width</label>
                  <span className="text-xs text-[var(--color-text-primary)]">{Math.round(crop.width)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={Math.max(5, Math.floor(100 - crop.x))}
                  step="1"
                  value={crop.width}
                  onChange={(event) =>
                    setCropWithinBounds({
                      ...crop,
                      width: parseInt(event.target.value, 10) || 5,
                    })
                  }
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Crop Height</label>
                  <span className="text-xs text-[var(--color-text-primary)]">{Math.round(crop.height)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={Math.max(5, Math.floor(100 - crop.y))}
                  step="1"
                  value={crop.height}
                  onChange={(event) =>
                    setCropWithinBounds({
                      ...crop,
                      height: parseInt(event.target.value, 10) || 5,
                    })
                  }
                  className="w-full accent-[var(--color-text-primary)]"
                />
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
                  <span className="text-xs text-[var(--color-text-primary)]">{Math.round(parseFloat(quality) * 100)}%</span>
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
                    <p className="font-medium">Crop complete.</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Exported format: {result.outputType.replace("image/", "").toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => {
                  setFile(null);
                  setError(null);
                  setResult(null);
                }}
                className="flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              >
                 Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={converting || crop.width === 0}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-4 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CropIcon className="h-4 w-4" />
                {converting ? "Processing..." : "Crop & Download"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
