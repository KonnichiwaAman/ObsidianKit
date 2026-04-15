import { useEffect, useState } from "react";
import JSZip from "jszip";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { downloadBlob, formatFileSize, getErrorMessage } from "@/tools/image-utils";
import { MediaFileInput } from "@/tools/media-suite/MediaFileInput";
import { transcodeFile } from "@/tools/media-suite/ffmpegClient";
import {
  buildOutputFileName,
  clampNumber,
  formatDurationSeconds,
  readVideoMetadata,
  type MediaMetadata,
} from "@/tools/media-suite/mediaUtils";

interface ExtractedFrame {
  name: string;
  blob: Blob;
}

export default function FrameExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [startSeconds, setStartSeconds] = useState("0");
  const [endSeconds, setEndSeconds] = useState("0");
  const [frameCount, setFrameCount] = useState("8");
  const [outputWidth, setOutputWidth] = useState("960");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [skippedFrames, setSkippedFrames] = useState(0);
  const [zipName, setZipName] = useState("");

  useEffect(() => {
    if (!file) {
      setMetadata(null);
      setMetadataError(null);
      setStartSeconds("0");
      setEndSeconds("0");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setMetadataError(null);
        const info = await readVideoMetadata(file);
        if (cancelled) return;
        setMetadata(info);
        setStartSeconds("0");
        setEndSeconds(info.durationSeconds.toFixed(3));
      } catch (error) {
        if (cancelled) return;
        setMetadata(null);
        setMetadataError(getErrorMessage(error, "Unable to read video metadata."));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [file]);

  async function handleExtract() {
    if (!file || !metadata) return;

    setProcessing(true);
    setError(null);
    setFrames([]);
    setSkippedFrames(0);
    setProgress(0);

    try {
      const start = clampNumber(Number.parseFloat(startSeconds) || 0, 0, metadata.durationSeconds);
      const rawEnd = clampNumber(Number.parseFloat(endSeconds) || metadata.durationSeconds, start + 0.1, metadata.durationSeconds);
      const safeDurationCap = Math.max(start + 0.05, metadata.durationSeconds - 0.02);
      const end = clampNumber(rawEnd, start + 0.05, safeDurationCap);
      const count = clampNumber(Math.round(Number.parseFloat(frameCount) || 8), 1, 30);
      const width = clampNumber(Math.round(Number.parseFloat(outputWidth) || 960), 160, 1920);

      const interval = count === 1 ? 0 : (end - start) / (count - 1);
      const extracted: ExtractedFrame[] = [];
      let skipped = 0;

      for (let index = 0; index < count; index += 1) {
        const targetTimestamp = start + interval * index;
        const timestamp = clampNumber(
          index === count - 1 ? Math.max(start, end - 0.03) : targetTimestamp,
          start,
          Math.max(start, metadata.durationSeconds - 0.03),
        );
        const frameName = `frame_${String(index + 1).padStart(3, "0")}.jpg`;

        try {
          const blob = await transcodeFile({
            inputFile: file,
            outputFileName: frameName,
            outputMimeType: "image/jpeg",
            buildArgs: (inputName, outputName) => [
              "-i",
              inputName,
              "-ss",
              timestamp.toFixed(3),
              "-map",
              "0:v:0",
              "-an",
              "-sn",
              "-dn",
              "-frames:v",
              "1",
              "-vf",
              `scale=${width}:-1:flags=lanczos`,
              "-q:v",
              "2",
              outputName,
            ],
            onProgress: (ffmpegProgress) => {
              const globalProgress = (index + ffmpegProgress) / count;
              setProgress(globalProgress);
            },
          });

          extracted.push({ name: frameName, blob });
        } catch {
          skipped += 1;
          setProgress((index + 1) / count);
        }
      }

      if (extracted.length === 0) {
        throw new Error("No frames could be extracted from this time range. Try a wider range or lower frame count.");
      }

      const zip = new JSZip();
      for (const frame of extracted) {
        zip.file(frame.name, frame.blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const outputName = buildOutputFileName(file.name, "_frames", "zip");

      setFrames(extracted);
  setSkippedFrames(skipped);
      setZipName(outputName);
      downloadBlob(zipBlob, outputName);
    } catch (error) {
      setError(getErrorMessage(error, "Frame extraction failed."));
    } finally {
      setProcessing(false);
    }
  }

  const duration = metadata?.durationSeconds ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MediaFileInput
        file={file}
        accept="video/*"
        maxSizeMB={500}
        disabled={processing}
        helperText="Extract a set of evenly spaced JPG frames and download them as ZIP."
        onChange={(nextFile) => {
          setFile(nextFile);
          setError(null);
          setFrames([]);
          setZipName("");
        }}
      />

      {metadataError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{metadataError}</span>
          </div>
        </div>
      )}

      {file && metadata && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">Video duration: {formatDurationSeconds(duration)}</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Start (seconds)</label>
              <input
                type="number"
                min="0"
                max={Math.max(0, duration - 0.1)}
                step="0.1"
                value={startSeconds}
                disabled={processing}
                onChange={(event) => setStartSeconds(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">End (seconds)</label>
              <input
                type="number"
                min="0.1"
                max={duration}
                step="0.1"
                value={endSeconds}
                disabled={processing}
                onChange={(event) => setEndSeconds(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Frame count</label>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={frameCount}
                disabled={processing}
                onChange={(event) => setFrameCount(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output width</label>
              <input
                type="number"
                min="160"
                max="1920"
                step="10"
                value={outputWidth}
                disabled={processing}
                onChange={(event) => setOutputWidth(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>
          </div>

          {processing && (
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 text-xs text-[var(--color-text-secondary)]">
              Extracting frames... {Math.round(progress * 100)}%
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleExtract}
            disabled={processing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {processing ? "Extracting..." : "Extract Frames + Download ZIP"}
          </button>

          {frames.length > 0 && zipName && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {frames.length} frame(s) extracted{skippedFrames > 0 ? `, ${skippedFrames} skipped` : ""}. ZIP ready: {zipName} ({formatFileSize(frames.reduce((sum, frame) => sum + frame.blob.size, 0))} total images).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
