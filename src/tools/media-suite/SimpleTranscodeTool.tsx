import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Wand2 } from "lucide-react";
import { downloadBlob, getErrorMessage } from "@/tools/image-utils";
import { MediaFileInput } from "@/tools/media-suite/MediaFileInput";
import { MediaResultPanel } from "@/tools/media-suite/MediaResultPanel";
import { transcodeFile } from "@/tools/media-suite/ffmpegClient";
import {
  buildOutputFileName,
  type MediaMetadata,
} from "@/tools/media-suite/mediaUtils";

export interface TranscodeFormatOption {
  id: string;
  label: string;
  extension: string;
  mime: string;
}

interface SettingsRenderContext<TSettings> {
  settings: TSettings;
  setSettings: React.Dispatch<React.SetStateAction<TSettings>>;
  metadata: MediaMetadata | null;
  file: File | null;
  processing: boolean;
}

interface BuildArgsContext<TSettings> {
  settings: TSettings;
  metadata: MediaMetadata | null;
  file: File;
  format: TranscodeFormatOption;
}

interface SimpleTranscodeToolProps<TSettings> {
  accept: string;
  maxInputMB: number;
  helperText: string;
  startLabel: string;
  initialSettings: TSettings;
  formatOptions: TranscodeFormatOption[];
  defaultFormatId: string;
  renderSettings: (context: SettingsRenderContext<TSettings>) => React.ReactNode;
  buildArgs: (
    inputName: string,
    outputName: string,
    context: BuildArgsContext<TSettings>,
  ) => string[] | string[][];
  getOutputSuffix?: (context: BuildArgsContext<TSettings>) => string;
  readMetadata?: (file: File) => Promise<MediaMetadata>;
  getResultNote?: (context: BuildArgsContext<TSettings>) => string | undefined;
}

export function SimpleTranscodeTool<TSettings>({
  accept,
  maxInputMB,
  helperText,
  startLabel,
  initialSettings,
  formatOptions,
  defaultFormatId,
  renderSettings,
  buildArgs,
  getOutputSuffix,
  readMetadata,
  getResultNote,
}: SimpleTranscodeToolProps<TSettings>) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TSettings>(initialSettings);
  const [formatId, setFormatId] = useState(defaultFormatId);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState("");
  const [resultNote, setResultNote] = useState<string | null>(null);

  const formatOption = formatOptions.find((item) => item.id === formatId) ?? formatOptions[0];

  useEffect(() => {
    if (!file || !readMetadata) {
      setMetadata(null);
      setMetadataError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setMetadataError(null);
        const nextMetadata = await readMetadata(file);
        if (cancelled) return;
        setMetadata(nextMetadata);
      } catch (error) {
        if (cancelled) return;
        setMetadata(null);
        setMetadataError(getErrorMessage(error, "Failed to read media metadata."));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [file, readMetadata]);

  function clearResultState() {
    setError(null);
    setResultBlob(null);
    setResultName("");
    setResultNote(null);
  }

  async function handleProcess() {
    if (!file || !formatOption) return;

    setProcessing(true);
    setProgress(0);
    clearResultState();

    const context: BuildArgsContext<TSettings> = {
      settings,
      metadata,
      file,
      format: formatOption,
    };

    try {
      const suffix = getOutputSuffix ? getOutputSuffix(context) : "_processed";
      const outputName = buildOutputFileName(file.name, suffix, formatOption.extension);

      const blob = await transcodeFile({
        inputFile: file,
        outputFileName: outputName,
        outputMimeType: formatOption.mime,
        onProgress: setProgress,
        buildArgs: (inputName, ffmpegOutputName) => buildArgs(inputName, ffmpegOutputName, context),
      });

      setResultBlob(blob);
      setResultName(outputName);
      setResultNote(getResultNote ? getResultNote(context) ?? null : null);
    } catch (error) {
      setError(getErrorMessage(error, "Media processing failed."));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MediaFileInput
        file={file}
        accept={accept}
        maxSizeMB={maxInputMB}
        disabled={processing}
        helperText={helperText}
        onChange={(nextFile) => {
          setFile(nextFile);
          clearResultState();
        }}
      />

      {metadataError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{metadataError}</span>
          </div>
        </div>
      )}

      {file && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
          {renderSettings({
            settings,
            setSettings,
            metadata,
            file,
            processing,
          })}

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Output Format</label>
            <select
              value={formatId}
              onChange={(event) => setFormatId(event.target.value)}
              disabled={processing}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)] disabled:opacity-70"
            >
              {formatOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {processing && (
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 text-xs text-[var(--color-text-secondary)]">
              Processing... {Math.round(progress * 100)}%
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleProcess}
            disabled={processing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {processing ? "Processing..." : startLabel}
          </button>
        </div>
      )}

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
  );
}
