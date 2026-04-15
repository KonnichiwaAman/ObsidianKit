import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  qualityScale: number;
  audioBitrate: number;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "avi", label: "AVI", extension: "avi", mime: "video/x-msvideo" },
];

export default function Mp4ToAvi() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/mp4,.mp4"
      maxInputMB={600}
      helperText="Convert MP4 videos to AVI for legacy playback workflows."
      startLabel="Convert to AVI"
      initialSettings={{ qualityScale: 4, audioBitrate: 160 }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="avi"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Video quality scale (1 best, 10 smaller)</label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.qualityScale}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, qualityScale: Number(event.target.value) }))}
              className="w-full accent-[var(--color-text-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)]">Current: {settings.qualityScale}</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Audio bitrate (kbps)</label>
            <input
              type="number"
              min="96"
              max="320"
              step="16"
              value={settings.audioBitrate}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, audioBitrate: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      )}
      getOutputSuffix={() => "_converted"}
      buildArgs={(inputName, outputName, { settings }) => [
        "-i",
        inputName,
        "-c:v",
        "mpeg4",
        "-qscale:v",
        String(settings.qualityScale),
        "-c:a",
        "mp3",
        "-b:a",
        `${settings.audioBitrate}k`,
        outputName,
      ]}
    />
  );
}
