import {
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  Package,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import { formatFileSize } from "@/tools/image-utils";
import type { BatchQueueItem } from "@/hooks/useImageBatchQueue";

interface ImageBatchQueueProps {
  title?: string;
  runLabel?: string;
  zipLabel?: string;
  zipFileName?: string;
  hideWhenEmpty?: boolean;
  items: BatchQueueItem[];
  processing: boolean;
  progressLabel: string;
  onRun: () => void;
  onRequeue: () => void;
  onDownloadZip: () => void;
  onDownloadItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onClear: () => void;
}

function statusBadge(item: BatchQueueItem) {
  switch (item.status) {
    case "done":
      return <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-400">Done</span>;
    case "error":
      return <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-medium text-red-400">Error</span>;
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-400">
          <LoaderCircle className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    default:
      return <span className="rounded-full bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-400">Queued</span>;
  }
}

export function ImageBatchQueue({
  title = "Batch Queue",
  runLabel = "Process Queue",
  zipLabel = "Download ZIP",
  zipFileName,
  hideWhenEmpty = true,
  items,
  processing,
  progressLabel,
  onRun,
  onRequeue,
  onDownloadZip,
  onDownloadItem,
  onRemoveItem,
  onClear,
}: ImageBatchQueueProps) {
  const counts = {
    total: items.length,
    queued: items.filter((item) => item.status === "queued").length,
    done: items.filter((item) => item.status === "done").length,
    error: items.filter((item) => item.status === "error").length,
  };

  const aggregateMetrics = useMemo(() => {
    const completedWithMetrics = items.filter(
      (item) =>
        item.status === "done" &&
        typeof item.metrics?.inputBytes === "number" &&
        typeof item.metrics?.outputBytes === "number",
    );

    if (completedWithMetrics.length === 0) {
      return null;
    }

    const totalInput = completedWithMetrics.reduce(
      (sum, item) => sum + (item.metrics?.inputBytes ?? 0),
      0,
    );
    const totalOutput = completedWithMetrics.reduce(
      (sum, item) => sum + (item.metrics?.outputBytes ?? 0),
      0,
    );

    const savedPercent =
      totalInput > 0 ? Math.max(0, Math.round(((totalInput - totalOutput) / totalInput) * 100)) : 0;

    return {
      totalInput,
      totalOutput,
      savedPercent,
      itemCount: completedWithMetrics.length,
    };
  }, [items]);

  if (hideWhenEmpty && !processing && counts.total === 0 && !progressLabel) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {counts.total} files | {counts.queued} queued | {counts.done} complete | {counts.error} failed
          </p>
          {zipFileName && <p className="text-[11px] text-[var(--color-text-muted)]">ZIP name: {zipFileName}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRun}
            disabled={processing || counts.total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {runLabel}
          </button>

          <button
            onClick={onRequeue}
            disabled={processing || counts.total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Requeue
          </button>

          <button
            onClick={onDownloadZip}
            disabled={processing || counts.done === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-text-primary)] px-3 py-2 text-xs font-medium text-[var(--color-bg-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Package className="h-3.5 w-3.5" />
            {zipLabel}
          </button>

          <button
            onClick={onClear}
            disabled={processing || counts.total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {progressLabel && (
        <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
          {progressLabel}
        </div>
      )}

      {aggregateMetrics && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <p>
            {aggregateMetrics.itemCount} completed file(s): {formatFileSize(aggregateMetrics.totalInput)} {"->"}{" "}
            {formatFileSize(aggregateMetrics.totalOutput)} ({aggregateMetrics.savedPercent}% saved)
          </p>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)]">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
            Queue is empty.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-primary)]">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{item.file.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{formatFileSize(item.file.size)}</p>

                    {typeof item.metrics?.inputBytes === "number" && typeof item.metrics?.outputBytes === "number" && (
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        Output: {formatFileSize(item.metrics.outputBytes)} | Saved: {item.metrics.savedPercent ?? 0}%
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {statusBadge(item)}

                    {item.status === "done" && item.outputBlob && item.outputFileName && (
                      <button
                        onClick={() => onDownloadItem(item.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                      >
                        <Download className="h-3 w-3" />
                        File
                      </button>
                    )}

                    {!processing && (
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-400 transition hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {item.error && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    {item.error}
                  </p>
                )}

                {item.note && !item.error && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.note}
                  </p>
                )}

                {item.status === "done" && !item.note && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ready for ZIP export
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
