import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  sampleRate: number;
  channels: 1 | 2;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "wav", label: "WAV", extension: "wav", mime: "audio/wav" },
];

export default function Mp3ToWav() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="audio/mpeg,.mp3"
      maxInputMB={300}
      helperText="Convert MP3 files to uncompressed WAV output."
      startLabel="Convert to WAV"
      initialSettings={{ sampleRate: 44100, channels: 2 }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="wav"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      getOutputSuffix={() => "_converted"}
      buildArgs={(inputName, outputName, { settings }) => [
        "-i",
        inputName,
        "-ar",
        String(settings.sampleRate),
        "-ac",
        String(settings.channels),
        "-c:a",
        "pcm_s16le",
        outputName,
      ]}
    />
  );
}
