export function formatDurationSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildOutputFileName(inputName: string, suffix: string, extension: string): string {
  const baseName = inputName.replace(/\.[^/.]+$/, "");
  const safeExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return `${baseName}${suffix}${safeExtension}`;
}

export interface MediaMetadata {
  durationSeconds: number;
  width?: number;
  height?: number;
}

async function loadMetadataWithElement<T extends HTMLAudioElement | HTMLVideoElement>(
  element: T,
  file: File,
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);

    element.preload = "metadata";
    element.src = objectUrl;

    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      const base: MediaMetadata = { durationSeconds: duration };

      if (element instanceof HTMLVideoElement) {
        base.width = element.videoWidth;
        base.height = element.videoHeight;
      }

      URL.revokeObjectURL(objectUrl);
      resolve(base);
    };

    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read media metadata."));
    };
  });
}

export async function readVideoMetadata(file: File): Promise<MediaMetadata> {
  const video = document.createElement("video");
  return loadMetadataWithElement(video, file);
}

export async function readAudioMetadata(file: File): Promise<MediaMetadata> {
  const audio = document.createElement("audio");
  return loadMetadataWithElement(audio, file);
}

export function buildAtempoChain(speed: number): string {
  let remaining = speed;
  const segments: string[] = [];

  while (remaining > 2) {
    segments.push("atempo=2");
    remaining /= 2;
  }

  while (remaining < 0.5) {
    segments.push("atempo=0.5");
    remaining /= 0.5;
  }

  segments.push(`atempo=${remaining.toFixed(4)}`);
  return segments.join(",");
}
