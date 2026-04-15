export type ExportImageType = "image/jpeg" | "image/png" | "image/webp";

const EXTENSION_BY_MIME: Record<ExportImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}

export interface CanvasExportOptions {
  type: ExportImageType;
  quality?: number;
  fallbackType?: ExportImageType;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

export function getExtensionFromMime(mimeType: string): string {
  if (mimeType in EXTENSION_BY_MIME) {
    return EXTENSION_BY_MIME[mimeType as ExportImageType];
  }
  return "bin";
}

export function buildOutputName(fileName: string, suffix: string, mimeType: string): string {
  const baseName = getBaseFileName(fileName);
  const ext = getExtensionFromMime(mimeType);
  return `${baseName}${suffix}.${ext}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function loadImageElement(blob: Blob): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({ image, objectUrl });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be decoded."));
    };

    image.src = objectUrl;
  });
}

export async function decodeImageBlob(blob: Blob): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch {
      // Continue to HTMLImageElement fallback for unsupported/edge formats.
    }
  }

  const { image, objectUrl } = await loadImageElement(blob);

  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    source: image,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

export function getCanvasContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not initialize a 2D canvas context.");
  }
  return context;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Browser could not export the image as ${type}.`));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  options: CanvasExportOptions,
): Promise<{ blob: Blob; type: ExportImageType }> {
  try {
    const blob = await canvasToBlob(canvas, options.type, options.quality);
    return { blob, type: options.type };
  } catch (error) {
    if (options.fallbackType && options.fallbackType !== options.type) {
      const fallbackBlob = await canvasToBlob(canvas, options.fallbackType, options.quality);
      return { blob: fallbackBlob, type: options.fallbackType };
    }

    throw error;
  }
}
