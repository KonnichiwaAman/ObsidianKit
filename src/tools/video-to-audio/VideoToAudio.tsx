import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  bitrate: number;
  channels: 1 | 2;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mp3", label: "MP3", extension: "mp3", mime: "audio/mpeg" },
  { id: "wav", label: "WAV", extension: "wav", mime: "audio/wav" },
  { id: "m4a", label: "M4A (AAC)", extension: "m4a", mime: "audio/mp4" },
];

export default function VideoToAudio() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/*"
      maxInputMB={600}
      helperText="Extract clean audio tracks from video files."
      startLabel="Extract Audio"
      initialSettings={{ bitrate: 192, channels: 2 }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mp3"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Audio bitrate (kbps)</label>
            <input
              type="number"
              min="64"
              max="320"
              step="16"
              value={settings.bitrate}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, bitrate: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
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
      getOutputSuffix={() => "_audio"}
      buildArgs={(inputName, outputName, { settings, format }) => {
        if (format.id === "wav") {
          return [
            "-i",
            inputName,
            "-vn",
            "-sn",
            "-dn",
            "-map",
            "0:a:0",
            "-ac",
            String(settings.channels),
            "-c:a",
            "pcm_s16le",
            outputName,
          ];
        }

        if (format.id === "m4a") {
          return [
            [
              "-i",
              inputName,
              "-vn",
              "-sn",
              "-dn",
              "-map",
              "0:a:0",
              "-ac",
              String(settings.channels),
              "-c:a",
              "aac",
              "-b:a",
              `${settings.bitrate}k`,
              outputName,
            ],
            [
              "-i",
              inputName,
              "-vn",
              "-sn",
              "-dn",
              "-map",
              "0:a:0",
              "-ac",
              String(settings.channels),
              "-b:a",
              `${settings.bitrate}k`,
              outputName,
            ],
          ];
        }

        return [
          [
            "-i",
            inputName,
            "-vn",
            "-sn",
            "-dn",
            "-map",
            "0:a:0",
            "-ac",
            String(settings.channels),
            "-c:a",
            "libmp3lame",
            "-b:a",
            `${settings.bitrate}k`,
            outputName,
          ],
          [
            "-i",
            inputName,
            "-vn",
            "-sn",
            "-dn",
            "-map",
            "0:a:0",
            "-ac",
            String(settings.channels),
            "-c:a",
            "mp3",
            "-b:a",
            `${settings.bitrate}k`,
            outputName,
          ],
          [
            "-i",
            inputName,
            "-vn",
            "-sn",
            "-dn",
            "-map",
            "0:a:0",
            "-ac",
            String(settings.channels),
            "-b:a",
            `${settings.bitrate}k`,
            outputName,
          ],
        ];
      }}
    />
  );
}
