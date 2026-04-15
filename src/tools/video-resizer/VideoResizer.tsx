import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";

interface Settings {
  width: number;
  height: number;
  fitMode: "contain" | "cover";
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "mp4", label: "MP4", extension: "mp4", mime: "video/mp4" },
  { id: "mov", label: "MOV", extension: "mov", mime: "video/quicktime" },
];

export default function VideoResizer() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/*"
      maxInputMB={600}
      helperText="Resize videos to fixed dimensions with contain or cover fitting."
      startLabel="Resize Video"
      initialSettings={{ width: 1280, height: 720, fitMode: "contain" }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="mp4"
      renderSettings={({ settings, setSettings, processing }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Width (px)</label>
            <input
              type="number"
              min="160"
              max="3840"
              step="2"
              value={settings.width}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, width: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Height (px)</label>
            <input
              type="number"
              min="160"
              max="3840"
              step="2"
              value={settings.height}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, height: Number(event.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Fit Mode</label>
            <select
              value={settings.fitMode}
              disabled={processing}
              onChange={(event) => setSettings((prev) => ({ ...prev, fitMode: event.target.value as Settings["fitMode"] }))}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value="contain">Contain (letterbox, no crop)</option>
              <option value="cover">Cover (fill frame, crop overflow)</option>
            </select>
          </div>
        </div>
      )}
      getOutputSuffix={({ settings }) => `_resized_${settings.width}x${settings.height}`}
      getResultNote={({ settings }) => `Fit mode: ${settings.fitMode}.`}
      buildArgs={(inputName, outputName, { settings }) => {
        const containFilter = `scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2`;
        const coverFilter = `scale=${settings.width}:${settings.height}:force_original_aspect_ratio=increase,crop=${settings.width}:${settings.height}`;

        return [
          "-i",
          inputName,
          "-vf",
          settings.fitMode === "contain" ? containFilter : coverFilter,
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
      }}
    />
  );
}
