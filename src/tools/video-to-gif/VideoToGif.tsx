import { SimpleTranscodeTool, type TranscodeFormatOption } from "@/tools/media-suite/SimpleTranscodeTool";
import { clampNumber, readVideoMetadata } from "@/tools/media-suite/mediaUtils";

interface Settings {
  startSeconds: number;
  durationSeconds: number;
  fps: number;
  width: number;
  loopForever: boolean;
}

const FORMAT_OPTIONS: TranscodeFormatOption[] = [
  { id: "gif", label: "GIF", extension: "gif", mime: "image/gif" },
];

export default function VideoToGif() {
  return (
    <SimpleTranscodeTool<Settings>
      accept="video/*"
      maxInputMB={400}
      helperText="Turn short video clips into GIF animations with FPS and width controls."
      startLabel="Convert to GIF"
      initialSettings={{ startSeconds: 0, durationSeconds: 4, fps: 12, width: 540, loopForever: true }}
      formatOptions={FORMAT_OPTIONS}
      defaultFormatId="gif"
      readMetadata={readVideoMetadata}
      renderSettings={({ settings, setSettings, metadata, processing }) => {
        const maxDuration = metadata?.durationSeconds ?? 30;

        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Start (seconds)</label>
              <input
                type="number"
                min="0"
                max={Math.max(0, maxDuration - 0.1)}
                step="0.1"
                disabled={processing}
                value={settings.startSeconds}
                onChange={(event) => setSettings((prev) => ({ ...prev, startSeconds: Math.max(0, Number(event.target.value)) }))}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Clip Duration (seconds)</label>
              <input
                type="number"
                min="0.3"
                max={Math.max(0.3, maxDuration)}
                step="0.1"
                disabled={processing}
                value={settings.durationSeconds}
                onChange={(event) => setSettings((prev) => ({ ...prev, durationSeconds: clampNumber(Number(event.target.value), 0.3, maxDuration) }))}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">FPS</label>
              <input
                type="range"
                min="6"
                max="24"
                step="1"
                disabled={processing}
                value={settings.fps}
                onChange={(event) => setSettings((prev) => ({ ...prev, fps: Number(event.target.value) }))}
                className="w-full accent-[var(--color-text-primary)]"
              />
              <p className="text-xs text-[var(--color-text-muted)]">{settings.fps} fps</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output Width (px)</label>
              <input
                type="number"
                min="180"
                max="1200"
                step="10"
                disabled={processing}
                value={settings.width}
                onChange={(event) => setSettings((prev) => ({ ...prev, width: Number(event.target.value) }))}
                className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={settings.loopForever}
                disabled={processing}
                onChange={(event) => setSettings((prev) => ({ ...prev, loopForever: event.target.checked }))}
                className="h-4 w-4 rounded border-[var(--color-border-primary)] bg-[var(--color-bg-input)]"
              />
              Loop forever
            </label>
          </div>
        );
      }}
      getOutputSuffix={() => "_gif"}
      buildArgs={(inputName, outputName, { settings }) => {
        const start = Math.max(0, settings.startSeconds);
        const duration = Math.max(0.3, settings.durationSeconds);

        return [
          "-ss",
          start.toFixed(3),
          "-t",
          duration.toFixed(3),
          "-i",
          inputName,
          "-vf",
          `fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos`,
          "-loop",
          settings.loopForever ? "0" : "-1",
          outputName,
        ];
      }}
    />
  );
}
