import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  bitrate: number;
  sampleRate: number;
  channels: 1 | 2;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mp3", label: "MP3", extension: "mp3", mime: "audio/mpeg" },
  { id: "m4a", label: "M4A (AAC)", extension: "m4a", mime: "audio/mp4" },
  { id: "ogg", label: "OGG", extension: "ogg", mime: "audio/ogg" },
];

export default function AudioCompressor() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="audio/*"
      maxInputMB={300}
      helperText="Compress audio files while controlling bitrate, sample rate, and channels."
      startLabel="Compress Audio"
      initialSettings={{ bitrate: 160, sampleRate: 44100, channels: 2 }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mp3"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Bitrate (kbps)</label>
            <input
              type="number"
              min="48"
              max="320"
              step="16"
              value={settings.bitrate}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, bitrate: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Sample rate</label>
            <select
              value={settings.sampleRate}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, sampleRate: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value={48000}>48,000 Hz</option>
              <option value={44100}>44,100 Hz</option>
              <option value={32000}>32,000 Hz</option>
              <option value={22050}>22,050 Hz</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Channels</label>
            <select
              value={settings.channels}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, channels: Number(event.target.value) as 1 | 2 }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value={2}>Stereo</option>
              <option value={1}>Mono</option>
            </select>
          </div>
        </div>
      )}
      getOutputSuffix={() => "_compressed"}
      buildArgs={(inputName, outputName, { settings, format }) => {
        const codecByFormat: Record<string, string> = {
          mp3: "libmp3lame",
          m4a: "aac",
          ogg: "libvorbis",
        };

        return [
          "-i",
          inputName,
          "-ar",
          String(settings.sampleRate),
          "-ac",
          String(settings.channels),
          "-c:a",
          codecByFormat[format.id] ?? "libmp3lame",
          "-b:a",
          `${settings.bitrate}k`,
          outputName,
        ];
      }}
    />
  );
}
