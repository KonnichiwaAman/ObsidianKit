import { useMemo, useState } from "react";
import JSZip from "jszip";
import { downloadBlob } from "@/tools/image-utils";

export type BatchItemStatus = "queued" | "processing" | "done" | "error";

export interface BatchItemMetrics {
  inputBytes?: number;
  outputBytes?: number;
  savedPercent?: number;
}

export interface BatchQueueItem {
  id: string;
  file: File;
  status: BatchItemStatus;
  outputBlob: Blob | null;
  outputFileName: string | null;
  error: string | null;
  note: string | null;
  metrics: BatchItemMetrics | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface BatchProcessorResult {
  blob: Blob;
  fileName: string;
  note?: string;
  metrics?: BatchItemMetrics;
}

export interface BatchProcessorContext {
  index: number;
  total: number;
}

export type BatchProcessor = (
  file: File,
  context: BatchProcessorContext,
) => Promise<BatchProcessorResult>;

export interface BatchSummary {
  total: number;
  queued: number;
  processing: number;
  done: number;
  error: number;
}

function createBatchItem(file: File): BatchQueueItem {
  return {
    id: createId(),
    file,
    status: "queued",
    outputBlob: null,
    outputFileName: null,
    error: null,
    note: null,
    metrics: null,
    startedAt: null,
    finishedAt: null,
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fileSignature(file: File): string {
  return `${file.name}__${file.size}__${file.lastModified}`;
}

function makeUniqueName(fileName: string, seenNames: Map<string, number>): string {
  const existing = seenNames.get(fileName) ?? 0;
  seenNames.set(fileName, existing + 1);

  if (existing === 0) return fileName;

  const extensionMatch = fileName.match(/\.[^/.]+$/);
  const extension = extensionMatch?.[0] ?? "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  return `${baseName}_${existing + 1}${extension}`;
}

export function useImageBatchQueue() {
  const [items, setItems] = useState<BatchQueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");

  const summary = useMemo<BatchSummary>(() => {
    return items.reduce<BatchSummary>(
      (accumulator, item) => {
        accumulator.total += 1;
        accumulator[item.status] += 1;
        return accumulator;
      },
      { total: 0, queued: 0, processing: 0, done: 0, error: 0 },
    );
  }, [items]);

  const completedItems = useMemo(
    () => items.filter((item) => item.status === "done" && item.outputBlob && item.outputFileName),
    [items],
  );

  function addFiles(files: File[]) {
    if (files.length === 0) return;

    setItems((previous) => {
      const signatures = new Set(previous.map((item) => fileSignature(item.file)));
      const next = [...previous];

      for (const file of files) {
        const signature = fileSignature(file);
        if (signatures.has(signature)) continue;
        signatures.add(signature);
        next.push(createBatchItem(file));
      }

      return next;
    });
  }

  function removeItem(itemId: string) {
    if (processing) return;
    setItems((previous) => previous.filter((item) => item.id !== itemId));
  }

  function clearAll() {
    if (processing) return;
    setItems([]);
    setProgressLabel("");
  }

  function requeueAll() {
    if (processing) return;
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        status: "queued",
        outputBlob: null,
        outputFileName: null,
        error: null,
        note: null,
        metrics: null,
        startedAt: null,
        finishedAt: null,
      })),
    );
    setProgressLabel("");
  }

  function downloadItem(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item?.outputBlob || !item.outputFileName) return;
    downloadBlob(item.outputBlob, item.outputFileName);
  }

  async function downloadZip(zipFileName: string): Promise<number> {
    const readyItems = items.filter(
      (item) => item.status === "done" && item.outputBlob && item.outputFileName,
    );

    if (readyItems.length === 0) {
      throw new Error("No processed files are available for ZIP export.");
    }

    const zip = new JSZip();
    const names = new Map<string, number>();

    for (const item of readyItems) {
      const uniqueName = makeUniqueName(item.outputFileName!, names);
      zip.file(uniqueName, item.outputBlob!);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const outputName = zipFileName.toLowerCase().endsWith(".zip") ? zipFileName : `${zipFileName}.zip`;
    downloadBlob(zipBlob, outputName);
    return readyItems.length;
  }

  async function runBatch(processor: BatchProcessor): Promise<void> {
    if (processing) return;

    const queue = items.filter((item) => item.status === "queued" || item.status === "error");
    if (queue.length === 0) {
      setProgressLabel("No files are queued.");
      return;
    }

    setProcessing(true);

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        setProgressLabel(`Processing ${index + 1}/${queue.length}: ${item.file.name}`);

        setItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "processing",
                  error: null,
                  note: null,
                  startedAt: Date.now(),
                  finishedAt: null,
                }
              : entry,
          ),
        );

        try {
          const result = await processor(item.file, { index, total: queue.length });

          setItems((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "done",
                    outputBlob: result.blob,
                    outputFileName: result.fileName,
                    note: result.note ?? null,
                    metrics: result.metrics ?? null,
                    error: null,
                    finishedAt: Date.now(),
                  }
                : entry,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error && error.message.trim() ? error.message : "Processing failed.";

          setItems((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "error",
                    error: message,
                    finishedAt: Date.now(),
                  }
                : entry,
            ),
          );
        }
      }

      setProgressLabel("Batch processing complete.");
    } finally {
      setProcessing(false);
    }
  }

  return {
    items,
    processing,
    progressLabel,
    summary,
    completedItems,
    addFiles,
    removeItem,
    clearAll,
    requeueAll,
    runBatch,
    downloadItem,
    downloadZip,
    setProgressLabel,
  };
}
