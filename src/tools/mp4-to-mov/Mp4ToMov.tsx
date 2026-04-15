import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  crf: number;
  audioBitrate: number;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mov", label: "MOV", extension: "mov", mime: "video/quicktime" },
];

export default function Mp4ToMov() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/mp4,.mp4"
      maxInputMB={600}
      helperText="Convert MP4 videos to MOV with H.264 + AAC output."
      startLabel="Convert to MOV"
      initialSettings={{ crf: 20, audioBitrate: 160 }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mov"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Video CRF</label>
            <input
              type="range"
              min="16"
              max="30"
              step="1"
              value={settings.crf}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, crf: Number(event.target.value) }))}
              className="w-full accent-[var(--color-text-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)]">Current: {settings.crf}</p>
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
        "libx264",
        "-preset",
        "medium",
        "-crf",
        String(settings.crf),
        "-c:a",
        "aac",
        "-b:a",
        `${settings.audioBitrate}k`,
        outputName,
      ]}
    />
  );
}
