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

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type CropGestureMode = "draw" | "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface CropGesture {
  mode: CropGestureMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPointerX: number;
  startPointerY: number;
  startCrop: CropBox;
}

const MIN_CROP_SIZE = 5;

const CROP_HANDLES: Array<{
  id: Exclude<CropGestureMode, "draw" | "move">;
  className: string;
}> = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
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
  const [crop, setCrop] = useState<CropBox>({ x: 10, y: 10, width: 80, height: 80 });
  const [activeGesture, setActiveGesture] = useState<CropGestureMode | null>(null);
  const gestureRef = useRef<CropGesture | null>(null);

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

  function setCropWithinBounds(nextCrop: CropBox) {
    const width = clamp(nextCrop.width, MIN_CROP_SIZE, 100);
    const height = clamp(nextCrop.height, MIN_CROP_SIZE, 100);
    const x = clamp(nextCrop.x, 0, 100 - width);
    const y = clamp(nextCrop.y, 0, 100 - height);
    setCrop({ x, y, width, height });
  }

  function getPointerPercent(event: React.PointerEvent): { x: number; y: number } | null {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function beginCropGesture(event: React.PointerEvent<HTMLElement>, mode: CropGestureMode) {
    const pointer = getPointerPercent(event);
    if (!pointer) return;

    gestureRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      startCrop: { ...crop },
    };

    setActiveGesture(mode);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function cropFromResizeGesture(gesture: CropGesture, dx: number, dy: number): CropBox {
    const start = gesture.startCrop;
    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;

    if (gesture.mode.includes("w")) left = start.x + dx;
    if (gesture.mode.includes("e")) right = start.x + start.width + dx;
    if (gesture.mode.includes("n")) top = start.y + dy;
    if (gesture.mode.includes("s")) bottom = start.y + start.height + dy;

    left = clamp(left, 0, right - MIN_CROP_SIZE);
    right = clamp(right, left + MIN_CROP_SIZE, 100);
    top = clamp(top, 0, bottom - MIN_CROP_SIZE);
    bottom = clamp(bottom, top + MIN_CROP_SIZE, 100);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  function handleGestureMove(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = ((event.clientX - gesture.startClientX) / rect.width) * 100;
    const dy = ((event.clientY - gesture.startClientY) / rect.height) * 100;

    if (gesture.mode === "draw") {
      const pointer = getPointerPercent(event);
      if (!pointer) return;

      setCropWithinBounds({
        x: Math.min(gesture.startPointerX, pointer.x),
        y: Math.min(gesture.startPointerY, pointer.y),
        width: Math.abs(pointer.x - gesture.startPointerX),
        height: Math.abs(pointer.y - gesture.startPointerY),
      });
      return;
    }

    if (gesture.mode === "move") {
      setCropWithinBounds({
        ...gesture.startCrop,
        x: gesture.startCrop.x + dx,
        y: gesture.startCrop.y + dy,
      });
      return;
    }

    setCrop(cropFromResizeGesture(gesture, dx, dy));
  }

  function endCropGesture(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = null;
    setActiveGesture(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    beginCropGesture(event, "draw");
  }

  function handleCropBoxPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>("[data-crop-handle]");
    const mode = (handle?.dataset.cropHandle as CropGestureMode | undefined) ?? "move";
    beginCropGesture(event, mode);
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
        <p className="text-sm text-[var(--color-text-muted)]">Crop images visually with a draggable, resizable selection.</p>
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
             <div
               ref={containerRef}
               className="relative inline-block touch-none select-none overflow-hidden rounded shadow-xl cursor-crosshair"
               style={{ maxHeight: "60vh" }}
               onPointerDown={handleCanvasPointerDown}
               onPointerMove={handleGestureMove}
               onPointerUp={endCropGesture}
               onPointerCancel={endCropGesture}
             >
                <img 
                   src={imgSrc} 
                   alt="To crop" 
                   className="pointer-events-none block max-h-[60vh] max-w-full select-none object-contain" 
                />
                
                {/* Crop Box */}
                <div 
                   onPointerDown={handleCropBoxPointerDown}
                   onPointerMove={handleGestureMove}
                   onPointerUp={endCropGesture}
                   onPointerCancel={endCropGesture}
                   style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                   }}
                   role="group"
                   aria-label="Crop selection"
                   className={`absolute z-10 touch-none border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] outline outline-1 outline-white/50 ${
                     activeGesture ? "cursor-grabbing" : "cursor-move"
                   }`}
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

                   {CROP_HANDLES.map((handle) => (
                     <span
                       key={handle.id}
                       aria-hidden="true"
                       data-crop-handle={handle.id}
                       className={`absolute z-20 h-8 w-8 sm:h-6 sm:w-6 ${handle.className}`}
                     >
                       <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-white shadow" />
                     </span>
                   ))}
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
