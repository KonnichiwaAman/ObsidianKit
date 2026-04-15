import { CheckCircle2, Download } from "lucide-react";
import { formatFileSize } from "@/tools/image-utils";

interface MediaResultPanelProps {
  inputSizeBytes: number;
  outputBlob: Blob;
  outputFileName: string;
  note?: string;
  onDownload: () => void;
}

export function MediaResultPanel({
  inputSizeBytes,
  outputBlob,
  outputFileName,
  note,
  onDownload,
}: MediaResultPanelProps) {
  const savedPercent = Math.max(0, Math.round((1 - outputBlob.size / inputSizeBytes) * 100));

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2 text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Processing complete</p>
          <p className="text-xs text-[var(--color-text-primary)]">
            Original: {formatFileSize(inputSizeBytes)} | Output: {formatFileSize(outputBlob.size)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Saved: {savedPercent}%
          </p>
          {note && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{note}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)]"
      >
        <Download className="h-4 w-4" />
        Download {outputFileName}
      </button>
    </div>
  );
}
