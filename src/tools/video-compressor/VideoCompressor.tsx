import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";
import { clampNumber, readVideoMetadata } from "@/tools/media-suite/mediaUtils";

interface Settings {
  mode: "quality" | "target-size";
  crf: number;
  audioBitrate: number;
  preset: "ultrafast" | "fast" | "medium" | "slow";
  maxWidth: number;
  targetSizeValue: number;
  targetSizeUnit: "KB" | "MB";
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mp4", label: "MP4", extension: "mp4", mime: "video/mp4" },
  { id: "mov", label: "MOV", extension: "mov", mime: "video/quicktime" },
];

function toBytes(value: number, unit: "KB" | "MB"): number {
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value * 1024 * 1024);
}

function estimateTargetVideoBitrateKbps(settings: Settings, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1200;
  }

  const targetBytes = toBytes(settings.targetSizeValue, settings.targetSizeUnit);
  const targetBits = targetBytes * 8;
  const audioBits = settings.audioBitrate * 1000 * durationSeconds;
  const safetyFactor = 0.92;

  const availableVideoBits = Math.max(200_000, targetBits - audioBits);
  const rawVideoBitrate = (availableVideoBits / Math.max(1, durationSeconds)) * safetyFactor;
  const kbps = Math.floor(rawVideoBitrate / 1000);

  return Math.round(clampNumber(kbps, 180, 12_000));
}

export default function VideoCompressor() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/*"
      maxInputMB={600}
      helperText="Compress large videos locally with adjustable quality and resolution."
      startLabel="Compress Video"
      initialSettings={{
        mode: "quality",
        crf: 26,
        audioBitrate: 128,
        preset: "medium",
        maxWidth: 1920,
        targetSizeValue: 20,
        targetSizeUnit: "MB",
      }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mp4"
      readMetadata={readVideoMetadata}
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Compression mode</label>
            <select
              value={settings.mode}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, mode: event.target.value as Settings["mode"] }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value="quality">Quality-first (existing CRF mode)</option>
              <option value="target-size">Target-size (limit by KB/MB)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">CRF (lower = better quality)</label>
            <input
              type="range"
              min="18"
              max="35"
              step="1"
              value={settings.crf}
              disabled={processing || settings.mode !== "quality"}
              onChange={(event) => setSettings((prev) => ({ ...prev, crf: Number(event.target.value) }))}
              className="w-full accent-[var(--color-text-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)]">Current: {settings.crf}</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Audio bitrate (kbps)</label>
            <input
              type="number"
              min="64"
              max="320"
              step="16"
              value={settings.audioBitrate}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, audioBitrate: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
          </div>

          {settings.mode === "target-size" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Target output size</label>
                <input
                  type="number"
                  min={settings.targetSizeUnit === "KB" ? 300 : 1}
                  max={settings.targetSizeUnit === "KB" ? 500000 : 1000}
                  step={settings.targetSizeUnit === "KB" ? 100 : 0.5}
                  value={settings.targetSizeValue}
                  disabled={processing}
                  onChange={(event) => setSettings((prev) => ({ ...prev, targetSizeValue: Number(event.target.value) || prev.targetSizeValue }))}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Target size unit</label>
                <select
                  value={settings.targetSizeUnit}
                  disabled={processing}
                  onChange={(event) => setSettings((prev) => ({ ...prev, targetSizeUnit: event.target.value as "KB" | "MB" }))}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                >
                  <option value="MB">MB</option>
                  <option value="KB">KB</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Compression preset</label>
            <select
              value={settings.preset}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, preset: event.target.value as Settings["preset"] }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value="ultrafast">Ultra Fast</option>
              <option value="fast">Fast</option>
              <option value="medium">Medium</option>
              <option value="slow">Slow (smaller files)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Max width</label>
            <select
              value={settings.maxWidth}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, maxWidth: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value={3840}>Keep up to 4K</option>
              <option value={2560}>Keep up to 1440p</option>
              <option value={1920}>Keep up to 1080p</option>
              <option value={1280}>Limit to 720p</option>
              <option value={854}>Limit to 480p</option>
            </select>
          </div>
        </div>
      )}
      getOutputSuffix={() => "_compressed"}
      getResultNote={({ settings, metadata }) => {
        if (settings.mode === "target-size") {
          const estimatedVideoBitrate = estimateTargetVideoBitrateKbps(settings, metadata?.durationSeconds ?? 0);
          return `Target-size mode: ${settings.targetSizeValue} ${settings.targetSizeUnit}, estimated video bitrate ${estimatedVideoBitrate} kbps, max width ${settings.maxWidth}px.`;
        }

        return `Quality mode: preset ${settings.preset}, CRF ${settings.crf}, max width ${settings.maxWidth}px.`;
      }}
      buildArgs={(inputName, outputName, { settings, metadata }) => {
        const scaleFilter = `scale='min(${settings.maxWidth},iw)':-2:flags=lanczos`;

        if (settings.mode === "target-size") {
          const targetVideoBitrate = estimateTargetVideoBitrateKbps(settings, metadata?.durationSeconds ?? 0);
          const maxRate = Math.round(targetVideoBitrate * 1.1);
          const bufferSize = Math.round(targetVideoBitrate * 2);

          return [
            [
              "-i",
              inputName,
              "-vf",
              scaleFilter,
              "-c:v",
              "libx264",
              "-preset",
              settings.preset,
              "-b:v",
              `${targetVideoBitrate}k`,
              "-maxrate",
              `${maxRate}k`,
              "-bufsize",
              `${bufferSize}k`,
              "-c:a",
              "aac",
              "-b:a",
              `${settings.audioBitrate}k`,
              "-movflags",
              "+faststart",
              outputName,
            ],
            [
              "-i",
              inputName,
              "-vf",
              scaleFilter,
              "-c:v",
              "mpeg4",
              "-q:v",
              "5",
              "-c:a",
              "aac",
              "-b:a",
              `${settings.audioBitrate}k`,
              outputName,
            ],
          ];
        }

        return [
          [
            "-i",
            inputName,
            "-vf",
            scaleFilter,
            "-c:v",
            "libx264",
            "-preset",
            settings.preset,
            "-crf",
            String(settings.crf),
            "-c:a",
            "aac",
            "-b:a",
            `${settings.audioBitrate}k`,
            "-movflags",
            "+faststart",
            outputName,
          ],
          [
            "-i",
            inputName,
            "-vf",
            scaleFilter,
            "-c:v",
            "mpeg4",
            "-q:v",
            "4",
            "-c:a",
            "aac",
            "-b:a",
            `${settings.audioBitrate}k`,
            outputName,
          ],
        ];
      }}
    />
  );
}
