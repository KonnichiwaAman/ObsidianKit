import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";
import { buildAtempoChain, clampNumber } from "@/tools/media-suite/mediaUtils";

interface Settings {
  speed: number;
  preservePitch: boolean;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mp3", label: "MP3", extension: "mp3", mime: "audio/mpeg" },
  { id: "wav", label: "WAV", extension: "wav", mime: "audio/wav" },
  { id: "m4a", label: "M4A (AAC)", extension: "m4a", mime: "audio/mp4" },
];

export default function AudioSpeedChanger() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="audio/*"
      maxInputMB={300}
      helperText="Change playback speed with optional pitch preservation."
      startLabel="Apply Speed Change"
      initialSettings={{ speed: 1, preservePitch: true }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mp3"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Speed Multiplier</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={settings.speed}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, speed: clampNumber(Number(event.target.value), 0.5, 2) }))}
              className="w-full accent-[var(--color-text-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)]">Current speed: {settings.speed.toFixed(2)}x</p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={settings.preservePitch}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, preservePitch: event.target.checked }))}
              className="h-4 w-4 rounded border-[var(--color-border-primary)] bg-[var(--color-bg-input)]"
            />
            Preserve pitch (recommended)
          </label>
        </div>
      )}
      getOutputSuffix={({ settings }) => `_speed-${settings.speed.toFixed(2)}x`}
      getResultNote={({ settings }) =>
        settings.preservePitch ? "Pitch-preserving atempo filter applied." : "Pitch-shifting mode applied."
      }
      buildArgs={(inputName, outputName, { settings, format }) => {
        const codecByFormat: Record<string, string> = {
          mp3: "libmp3lame",
          m4a: "aac",
          wav: "pcm_s16le",
        };

        const preservePitchFilter = buildAtempoChain(clampNumber(settings.speed, 0.5, 2));
        const pitchShiftFilter = `asetrate=44100*${settings.speed.toFixed(4)},aresample=44100`;

        return [
          "-i",
          inputName,
          "-filter:a",
          settings.preservePitch ? preservePitchFilter : pitchShiftFilter,
          "-c:a",
          codecByFormat[format.id] ?? "libmp3lame",
          ...(format.id === "wav" ? [] : ["-b:a", "192k"]),
          outputName,
        ];
      }}
    />
  );
}
