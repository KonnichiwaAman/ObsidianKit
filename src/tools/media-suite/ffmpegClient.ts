import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const DEFAULT_CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
const CORE_BASE_URL =
  import.meta.env.VITE_FFMPEG_CORE_BASE_URL?.trim() || DEFAULT_CORE_BASE_URL;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let progressListener: ((progress: number) => void) | null = null;
let lastLogMessages: string[] = [];

interface ReadableData {
  byteOffset: number;
  byteLength: number;
  buffer: ArrayBufferLike;
}

function createWorkspaceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function guessFileExtension(name: string): string {
  const match = name.match(/\.[^/.]+$/);
  return match?.[0] ?? "";
}

function sanitizeVirtualFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

  return sanitized || "file";
}

function toArrayBuffer(data: ReadableData): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function loadFFmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    if (!progressListener) return;
    progressListener(Math.max(0, Math.min(1, progress)));
  });

  ffmpeg.on("log", ({ message }) => {
    if (!message) return;
    lastLogMessages.push(message);
    if (lastLogMessages.length > 24) {
      lastLogMessages = lastLogMessages.slice(-24);
    }
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    workerURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.worker.js`, "text/javascript"),
  });

  return ffmpeg;
}

export async function ensureFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = loadFFmpeg().then((instance) => {
      ffmpegInstance = instance;
      return instance;
    });
  }

  return ffmpegLoadPromise;
}

export interface TranscodeOptions {
  inputFile: File;
  outputFileName: string;
  outputMimeType: string;
  buildArgs: (inputName: string, outputName: string) => string[] | string[][];
  onProgress?: (progress: number) => void;
}

function normalizeArgAttempts(args: string[] | string[][]): string[][] {
  if (args.length === 0) {
    return [[]];
  }

  if (Array.isArray(args[0])) {
    return args as string[][];
  }

  return [args as string[]];
}

function withGlobalFlags(args: string[]): string[] {
  return ["-y", ...args];
}

export async function transcodeFile({
  inputFile,
  outputFileName,
  outputMimeType,
  buildArgs,
  onProgress,
}: TranscodeOptions): Promise<Blob> {
  const ffmpeg = await ensureFFmpeg();
  const workspaceId = createWorkspaceId();
  const safeInputExtension = sanitizeVirtualFileName(guessFileExtension(inputFile.name));
  const inputName = `${workspaceId}_input${safeInputExtension}`;
  const outputName = `${workspaceId}_${sanitizeVirtualFileName(outputFileName)}`;
  const argAttempts = normalizeArgAttempts(buildArgs(inputName, outputName));
  const attemptErrors: string[] = [];

  progressListener = onProgress ?? null;
  lastLogMessages = [];

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

    for (let attemptIndex = 0; attemptIndex < argAttempts.length; attemptIndex += 1) {
      const attemptArgs = withGlobalFlags(argAttempts[attemptIndex]);

      try {
        await ffmpeg.exec(attemptArgs);
        const outputData = await ffmpeg.readFile(outputName);

        if (!(outputData instanceof Uint8Array)) {
          throw new Error("FFmpeg output was not readable.");
        }

        return new Blob([toArrayBuffer(outputData)], { type: outputMimeType });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown FFmpeg failure";
        attemptErrors.push(`Attempt ${attemptIndex + 1}: ${message}`);

        try {
          await ffmpeg.deleteFile(outputName);
        } catch {
          // Ignore cleanup errors between attempts.
        }
      }
    }

    const lastLog = lastLogMessages.length > 0
      ? ` FFmpeg: ${lastLogMessages[lastLogMessages.length - 1]}`
      : "";
    throw new Error(`Media processing failed after ${argAttempts.length} attempt(s). ${attemptErrors.join(" ")}${lastLog}`.trim());
  } finally {
    progressListener = null;

    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore cleanup errors.
    }

    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore cleanup errors.
    }
  }
}
