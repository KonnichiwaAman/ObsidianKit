import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, UploadCloud } from "lucide-react";
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
type WatermarkPosition = "center" | "bottom-right" | "bottom-left" | "top-right" | "top-left" | "tile";
type WatermarkType = "text" | "image";

interface WatermarkResult {
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

export default function WatermarkAdder() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [text, setText] = useState("Watermark");
  const [watermarkImageFile, setWatermarkImageFile] = useState<File | null>(null);
  const [watermarkScale, setWatermarkScale] = useState("22");
  const [color, setColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState("0.5");
  const [fontScale, setFontScale] = useState("5");
  const [tileAngle, setTileAngle] = useState("-30");
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState("0.95");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<DecodedImage | null>(null);
  const watermarkImageRef = useRef<DecodedImage | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawTransformed = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      source: DecodedImage,
      options?: { previewMaxSize?: number; backgroundColor?: string },
    ) => {
      const finalWidth = source.width;
      const finalHeight = source.height;
      const canvas = ctx.canvas;
      let scale = 1;

      if (options?.previewMaxSize) {
        scale = Math.min(1, options.previewMaxSize / finalWidth, options.previewMaxSize / finalHeight);
      }

      canvas.width = Math.max(1, Math.round(finalWidth * scale));
      canvas.height = Math.max(1, Math.round(finalHeight * scale));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      ctx.clearRect(0, 0, finalWidth, finalHeight);

      if (options?.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);
      }

      ctx.drawImage(source.source, 0, 0, finalWidth, finalHeight);

      ctx.save();
      ctx.globalAlpha = parseFloat(opacity);

      if (watermarkType === "image") {
        if (!watermarkImageRef.current) {
          ctx.restore();
          return;
        }

        const watermarkSource = watermarkImageRef.current;
        const margin = Math.max(8, Math.round(Math.min(finalWidth, finalHeight) * 0.02));
        const scalePercent = Math.min(80, Math.max(4, parseFloat(watermarkScale) || 22));
        const markWidth = Math.max(24, Math.round(finalWidth * (scalePercent / 100)));
        const markHeight = Math.max(24, Math.round(markWidth * (watermarkSource.height / watermarkSource.width)));

        if (position === "tile") {
          const stepX = Math.max(markWidth * 1.6, 80);
          const stepY = Math.max(markHeight * 1.8, 80);

          ctx.translate(finalWidth / 2, finalHeight / 2);
          ctx.rotate((parseFloat(tileAngle) * Math.PI) / 180);
          ctx.translate(-finalWidth / 2, -finalHeight / 2);

          for (let y = -finalHeight; y < finalHeight * 2; y += stepY) {
            for (let x = -finalWidth; x < finalWidth * 2; x += stepX) {
              ctx.drawImage(watermarkSource.source, x, y, markWidth, markHeight);
            }
          }
        } else {
          let x = finalWidth - markWidth - margin;
          let y = finalHeight - markHeight - margin;

          if (position === "center") {
            x = (finalWidth - markWidth) / 2;
            y = (finalHeight - markHeight) / 2;
          } else if (position === "bottom-left") {
            x = margin;
            y = finalHeight - markHeight - margin;
          } else if (position === "top-right") {
            x = finalWidth - markWidth - margin;
            y = margin;
          } else if (position === "top-left") {
            x = margin;
            y = margin;
          }

          ctx.drawImage(watermarkSource.source, x, y, markWidth, markHeight);
        }

        ctx.restore();
        return;
      }

      if (!text.trim()) {
        ctx.restore();
        return;
      }

      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      const fontSize = Math.max(12, Math.floor(finalHeight * (parseFloat(fontScale) / 100)));
      ctx.font = `bold ${fontSize}px sans-serif`;

      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;

      const margin = fontSize;

      if (position === "tile") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.translate(finalWidth / 2, finalHeight / 2);
        ctx.rotate((parseFloat(tileAngle) * Math.PI) / 180);
        ctx.translate(-finalWidth / 2, -finalHeight / 2);

        for (let y = -finalHeight; y < finalHeight * 2; y += fontSize * 4) {
          for (let x = -finalWidth; x < finalWidth * 2; x += textWidth * 1.5) {
            ctx.fillText(text, x, y);
          }
        }
      } else {
        ctx.textBaseline = "bottom";
        if (position.includes("center")) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, finalWidth / 2, finalHeight / 2);
        } else if (position.includes("left")) {
          ctx.textAlign = "left";
          const x = margin;
          const y = position.includes("top") ? margin + fontSize : finalHeight - margin;
          ctx.fillText(text, x, y);
        } else {
          ctx.textAlign = "right";
          const x = finalWidth - margin;
          const y = position.includes("top") ? margin + fontSize : finalHeight - margin;
          ctx.fillText(text, x, y);
        }
      }

      ctx.restore();
    },
    [color, fontScale, opacity, position, text, tileAngle, watermarkScale, watermarkType],
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
        setError(getErrorMessage(error, "Unable to load this image for watermarking."));
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
    let cancelled = false;

    async function loadWatermarkImage() {
      if (!watermarkImageFile) {
        watermarkImageRef.current?.close();
        watermarkImageRef.current = null;
        return;
      }

      try {
        watermarkImageRef.current?.close();
        watermarkImageRef.current = null;

        const decoded = await decodeImageBlob(watermarkImageFile);
        if (cancelled) {
          decoded.close();
          return;
        }

        watermarkImageRef.current = decoded;
        renderPreview();
      } catch (error) {
        if (cancelled) return;
        setError(getErrorMessage(error, "Unable to load watermark image."));
      }
    }

    void loadWatermarkImage();

    return () => {
      cancelled = true;
    };
  }, [renderPreview, watermarkImageFile]);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      watermarkImageRef.current?.close();
      watermarkImageRef.current = null;
    };
  }, []);

  async function handleDownload() {
    if (!file || !sourceRef.current || !canvasRef.current) return;
    if (watermarkType === "image" && !watermarkImageRef.current) {
      setError("Please upload a watermark image first.");
      return;
    }

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

      downloadBlob(blob, buildOutputName(file.name, "_watermarked", type));
      setResult({ outputType: type });
    } catch (error) {
       console.error("Watermark export failed", error);
       setError(getErrorMessage(error, "Failed to add watermark to this image."));
    } finally {
       setConverting(false);
    }
  }

  function handleNewFile(nextFile: File) {
    setFile(nextFile);
    setError(null);
    setResult(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Add text or image watermarks to your photos before sharing.</p>
      </div>

      {!file ? (
        <ImageUploader onUpload={handleNewFile} accept="image/*" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-6 h-[400px]">
            <canvas ref={previewCanvasRef} className="max-w-full max-h-full object-contain shadow-lg" />
          </div>
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 flex flex-col space-y-5">
             <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Watermark Type</label>
                <select
                   value={watermarkType}
                   onChange={(event) => setWatermarkType(event.target.value as WatermarkType)}
                   className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                >
                   <option value="text">Text watermark</option>
                   <option value="image">Image watermark</option>
                </select>
             </div>

             {watermarkType === "image" && (
               <div className="space-y-3 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3">
                 <div className="flex items-center justify-between gap-3">
                   <div className="min-w-0">
                     <p className="text-xs font-medium text-[var(--color-text-secondary)]">Watermark image</p>
                     <p className="truncate text-xs text-[var(--color-text-muted)]">
                       {watermarkImageFile ? watermarkImageFile.name : "No image selected"}
                     </p>
                   </div>
                   <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)]">
                     <UploadCloud className="h-3.5 w-3.5" />
                     Upload
                     <input
                       type="file"
                       accept="image/*"
                       className="hidden"
                       onChange={(event) => {
                         const next = event.target.files?.[0] ?? null;
                         setWatermarkImageFile(next);
                         setError(null);
                         setResult(null);
                         event.target.value = "";
                       }}
                     />
                   </label>
                 </div>

                 <div>
                   <div className="mb-2 flex justify-between">
                     <label className="text-xs font-medium text-[var(--color-text-secondary)]">Watermark scale</label>
                     <span className="text-xs text-[var(--color-text-primary)]">{watermarkScale}% width</span>
                   </div>
                   <input
                     type="range"
                     min="4"
                     max="80"
                     step="1"
                     value={watermarkScale}
                     onChange={(event) => setWatermarkScale(event.target.value)}
                     className="w-full accent-[var(--color-text-primary)]"
                   />
                 </div>

                 <div>
                   <div className="mb-2 flex justify-between">
                     <label className="text-xs font-medium text-[var(--color-text-secondary)]">Opacity</label>
                     <span className="text-xs text-[var(--color-text-primary)] font-medium">{Math.round(parseFloat(opacity) * 100)}%</span>
                   </div>
                   <input
                     type="range"
                     min="0.1"
                     max="1"
                     step="0.1"
                     value={opacity}
                     onChange={(event) => setOpacity(event.target.value)}
                     className="w-full accent-[var(--color-text-primary)]"
                   />
                 </div>
               </div>
             )}

             {watermarkType === "text" && (
             <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Watermark Text</label>
                <input
                   type="text"
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                />
             </div>
             )}

             {watermarkType === "text" && (
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Color</label>
                    <div className="flex h-[46px] w-full items-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 focus-within:border-[var(--color-border-hover)]">
                       <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                       />
                       <span className="ml-3 text-sm text-[var(--color-text-primary)] uppercase font-mono">{color}</span>
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between mb-2">
                       <label className="text-xs font-medium text-[var(--color-text-secondary)]">Opacity</label>
                       <span className="text-xs text-[var(--color-text-primary)] font-medium">{Math.round(parseFloat(opacity) * 100)}%</span>
                    </div>
                    <div className="h-[46px] flex items-center">
                        <input
                           type="range"
                           min="0.1" max="1" step="0.1"
                           value={opacity}
                           onChange={(e) => setOpacity(e.target.value)}
                           className="w-full accent-[var(--color-text-primary)]"
                        />
                    </div>
                 </div>
             </div>
               )}

               {watermarkType === "text" && (
               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <div className="mb-2 flex justify-between">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Text Size</label>
                        <span className="text-xs text-[var(--color-text-primary)]">{fontScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="12"
                        step="0.5"
                        value={fontScale}
                        onChange={(event) => setFontScale(event.target.value)}
                        className="w-full accent-[var(--color-text-primary)]"
                      />
                   </div>

                   <div>
                      <div className="mb-2 flex justify-between">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Tile Angle</label>
                        <span className="text-xs text-[var(--color-text-primary)]">{tileAngle}deg</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="1"
                        value={tileAngle}
                        onChange={(event) => setTileAngle(event.target.value)}
                        className="w-full accent-[var(--color-text-primary)]"
                      />
                   </div>
               </div>
                 )}

             <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Position</label>
                <select
                   value={position}
                   onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
                   className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                >
                   <option value="center">Center</option>
                   <option value="bottom-right">Bottom Right</option>
                   <option value="bottom-left">Bottom Left</option>
                   <option value="top-right">Top Right</option>
                   <option value="top-left">Top Left</option>
                   <option value="tile">Tile Across Image</option>
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
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
                     <p className="font-medium">Watermarked image ready.</p>
                     <p className="text-xs text-[var(--color-text-secondary)]">
                       Exported format: {result.outputType.replace("image/", "").toUpperCase()}
                     </p>
                   </div>
                 </div>
               </div>
             )}

            <div className="flex gap-4 pt-4 mt-auto">
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
                disabled={converting || (watermarkType === "text" ? !text.trim() : !watermarkImageFile)}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-4 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
