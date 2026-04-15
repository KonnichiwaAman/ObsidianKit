import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Scissors } from "lucide-react";
import { downloadBlob, getErrorMessage } from "@/tools/image-utils";
import { MediaFileInput } from "@/tools/media-suite/MediaFileInput";
import { MediaResultPanel } from "@/tools/media-suite/MediaResultPanel";
import { transcodeFile } from "@/tools/media-suite/ffmpegClient";
import {
  buildOutputFileName,
  clampNumber,
  formatDurationSeconds,
  readVideoMetadata,
  type MediaMetadata,
} from "@/tools/media-suite/mediaUtils";

type TrimmerOutput = "mp4" | "mov";

const CLIP_PRESETS_SECONDS = [5, 10, 15, 30, 60];

const OUTPUT_MIME: Record<TrimmerOutput, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
};

function toFixedSeconds(value: number): string {
  return clampNumber(value, 0, Number.POSITIVE_INFINITY).toFixed(3);
}

function parseNumeric(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function VideoTrimmer() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [startSeconds, setStartSeconds] = useState("0");
  const [endSeconds, setEndSeconds] = useState("0");
  const [accurateTrim, setAccurateTrim] = useState(false);
  const [outputFormat, setOutputFormat] = useState<TrimmerOutput>("mp4");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState("");
  const [resultNote, setResultNote] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
        setMetadataError(getErrorMessage(error, "Failed to read video metadata."));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const duration = metadata?.durationSeconds ?? 0;

  const startValue = clampNumber(parseNumeric(startSeconds, 0), 0, Math.max(0, duration));
  const endValue = clampNumber(parseNumeric(endSeconds, duration), 0, Math.max(0, duration));
  const safeEndValue = Math.max(endValue, startValue + 0.05);
  const trimLength = Math.max(0, safeEndValue - startValue);
  const startPercent = duration > 0 ? clampNumber((startValue / duration) * 100, 0, 100) : 0;
  const endPercent = duration > 0 ? clampNumber((safeEndValue / duration) * 100, 0, 100) : 100;
  const selectedWidthPercent = Math.max(0, endPercent - startPercent);

  function clearResultState() {
    setError(null);
    setResultBlob(null);
    setResultName("");
    setResultNote(null);
  }

  function updateStart(value: number) {
    const clamped = clampNumber(value, 0, Math.max(0, safeEndValue - 0.05));
    setStartSeconds(clamped.toFixed(3));
  }

  function updateEnd(value: number) {
    const minEnd = startValue + 0.05;
    const clamped = clampNumber(value, minEnd, Math.max(minEnd, duration));
    setEndSeconds(clamped.toFixed(3));
  }

  function getCurrentTime(): number {
    return videoRef.current?.currentTime ?? 0;
  }

  function applyClipPreset(seconds: number) {
    if (!duration) return;
    const newEnd = clampNumber(startValue + seconds, startValue + 0.05, duration);
    updateEnd(newEnd);
  }

  function applyFullDuration() {
    if (!duration) return;
    updateStart(0);
    updateEnd(duration);
  }

  function previewFromStart() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startValue;
    void videoRef.current.play();
  }

  async function handleTrim() {
    if (!file || !metadata) return;

    clearResultState();
    setProgress(0);
    setProcessing(true);

    try {
      const trimmedName = buildOutputFileName(file.name, "_trimmed", outputFormat);
      const blob = await transcodeFile({
        inputFile: file,
        outputFileName: trimmedName,
        outputMimeType: OUTPUT_MIME[outputFormat],
        onProgress: setProgress,
        buildArgs: (inputName, outputName) => {
          const start = toFixedSeconds(startValue);
          const end = toFixedSeconds(safeEndValue);

          if (accurateTrim) {
            return [
              "-i",
              inputName,
              "-ss",
              start,
              "-to",
              end,
              "-c:v",
              "libx264",
              "-preset",
              "medium",
              "-crf",
              "20",
              "-c:a",
              "aac",
              "-b:a",
              "160k",
              outputName,
            ];
          }

          return [
            "-ss",
            start,
            "-to",
            end,
            "-i",
            inputName,
            "-c",
            "copy",
            outputName,
          ];
        },
      });

      setResultBlob(blob);
      setResultName(trimmedName);
      setResultNote(
        accurateTrim
          ? "Accurate trim mode re-encoded the clip for frame precision."
          : "Fast trim mode used stream copy for speed.",
      );
    } catch (error) {
      setError(getErrorMessage(error, "Failed to trim this video."));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <MediaFileInput
        file={file}
        accept="video/*"
        maxSizeMB={600}
        disabled={processing}
        helperText="Supports MP4, MOV, WebM and more. Local processing only."
        onChange={(nextFile) => {
          setFile(nextFile);
          clearResultState();
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
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                className="h-auto max-h-[380px] w-full rounded-xl border border-[var(--color-border-primary)] bg-black"
              />
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Flexible Trim Controls</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Duration: {formatDurationSeconds(duration)} | Clip: {formatDurationSeconds(trimLength)}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 space-y-3">
              <div className="relative h-3 rounded-full bg-[var(--color-bg-card)]">
                <div
                  className="absolute inset-y-0 rounded-full bg-blue-500/30"
                  style={{ left: `${startPercent}%`, width: `${selectedWidthPercent}%` }}
                />
                <div
                  className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-blue-500"
                  style={{ left: `${startPercent}%` }}
                />
                <div
                  className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-blue-500"
                  style={{ left: `${endPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                <span>Start: {formatDurationSeconds(startValue)}</span>
                <span>Selection: {formatDurationSeconds(trimLength)}</span>
                <span>End: {formatDurationSeconds(safeEndValue)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {CLIP_PRESETS_SECONDS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => applyClipPreset(seconds)}
                    disabled={processing || duration <= 0}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                  >
                    {seconds}s clip
                  </button>
                ))}

                <button
                  type="button"
                  onClick={applyFullDuration}
                  disabled={processing || duration <= 0}
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  Full video
                </button>

                <button
                  type="button"
                  onClick={previewFromStart}
                  disabled={processing || duration <= 0}
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  Preview from start mark
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Time (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, safeEndValue - 0.05)}
                  step="0.01"
                  value={startSeconds}
                  onChange={(event) => updateStart(parseNumeric(event.target.value, startValue))}
                  className="w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStart(getCurrentTime())}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Set From Playhead
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStart(startValue - 1)}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStart(startValue + 1)}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    +1s
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">End Time (seconds)</label>
                <input
                  type="number"
                  min={startValue + 0.05}
                  max={duration}
                  step="0.01"
                  value={endSeconds}
                  onChange={(event) => updateEnd(parseNumeric(event.target.value, safeEndValue))}
                  className="w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateEnd(getCurrentTime())}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Set From Playhead
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEnd(safeEndValue - 1)}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEnd(safeEndValue + 1)}
                    className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    +1s
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Marker</label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={startValue}
                onChange={(event) => updateStart(parseNumeric(event.target.value, startValue))}
                className="w-full accent-[var(--color-text-primary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">End Marker</label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={safeEndValue}
                onChange={(event) => updateEnd(parseNumeric(event.target.value, safeEndValue))}
                className="w-full accent-[var(--color-text-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as TrimmerOutput)}
                  className="w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="mp4">MP4</option>
                  <option value="mov">MOV</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Trim Engine</label>
                <select
                  value={accurateTrim ? "accurate" : "fast"}
                  onChange={(event) => setAccurateTrim(event.target.value === "accurate")}
                  className="w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="fast">Fast (stream copy)</option>
                  <option value="accurate">Accurate (re-encode)</option>
                </select>
              </div>
            </div>

            {processing && (
              <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-3 text-xs text-[var(--color-text-secondary)]">
                Trimming... {Math.round(progress * 100)}%
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleTrim}
              disabled={processing || trimLength < 0.05}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
              {processing ? "Trimming..." : "Trim Video"}
            </button>
          </div>

          {file && resultBlob && resultName && (
            <MediaResultPanel
              inputSizeBytes={file.size}
              outputBlob={resultBlob}
              outputFileName={resultName}
              note={resultNote ?? undefined}
              onDownload={() => downloadBlob(resultBlob, resultName)}
            />
          )}
        </div>
      )}
    </div>
  );
}
