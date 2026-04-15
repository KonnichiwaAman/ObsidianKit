import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Files, UploadCloud, X } from "lucide-react";

interface ImageBatchUploaderProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  title?: string;
  initiallyExpanded?: boolean;
}

function parseAcceptTokens(accept: string): string[] {
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function isFileAccepted(file: File, accept: string): boolean {
  const tokens = parseAcceptTokens(accept);
  if (tokens.length === 0) return true;

  const lowerName = file.name.toLowerCase();
  const lowerType = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token === "*/*") return true;
    if (token === "image/*") return lowerType.startsWith("image/");

    if (token.endsWith("/*")) {
      const prefix = token.slice(0, token.length - 1);
      return lowerType.startsWith(prefix);
    }

    if (token.startsWith(".")) {
      return lowerName.endsWith(token);
    }

    return lowerType === token;
  });
}

function formatAcceptedTypes(accept: string): string {
  const formatted = parseAcceptTokens(accept).map((token) =>
    token
      .replace(/^image\//, "")
      .replace(/^\./, "")
      .toUpperCase(),
  );

  return formatted.join(", ") || "ALL";
}

export function ImageBatchUploader({
  onUpload,
  accept = "image/*",
  maxSizeMB = 20,
  maxFiles = 50,
  title = "Batch Mode",
  initiallyExpanded = false,
}: ImageBatchUploaderProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFiles(inputFiles: File[]) {
    if (inputFiles.length === 0) return;

    const accepted: File[] = [];
    const rejectedType: string[] = [];
    const rejectedSize: string[] = [];

    for (const file of inputFiles) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        rejectedSize.push(file.name);
        continue;
      }

      if (!isFileAccepted(file, accept)) {
        rejectedType.push(file.name);
        continue;
      }

      accepted.push(file);
    }

    if (accepted.length > maxFiles) {
      accepted.length = maxFiles;
    }

    if (accepted.length > 0) {
      onUpload(accepted);
    }

    if (rejectedType.length === 0 && rejectedSize.length === 0 && inputFiles.length <= maxFiles) {
      setError(null);
      return;
    }

    const messages: string[] = [];
    if (rejectedType.length > 0) {
      messages.push(`${rejectedType.length} file(s) skipped due to invalid type.`);
    }
    if (rejectedSize.length > 0) {
      messages.push(`${rejectedSize.length} file(s) exceeded ${maxSizeMB} MB.`);
    }
    if (inputFiles.length > maxFiles) {
      messages.push(`Only the first ${maxFiles} accepted files were queued.`);
    }

    setError(messages.join(" "));
  }

  function handleDrag(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const files = Array.from(event.dataTransfer.files || []);
    processFiles(files);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    processFiles(files);
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Process multiple files in one queue and export as ZIP.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
          >
            <Files className="h-3.5 w-3.5" />
            {expanded ? "Hide Batch Upload" : "Open Batch Upload"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className={`relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            dragActive
              ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
              : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)]"
          } ${error ? "border-red-500/50 bg-red-500/5" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            multiple
          />

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
            <UploadCloud
              className={`h-7 w-7 ${dragActive ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
            />
          </div>

          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-blue-500 hover:text-blue-600 focus:outline-none focus:underline"
            >
              Select files
            </button>{" "}
            or drag and drop
          </p>

          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Files className="h-3.5 w-3.5" />
              Up to {maxFiles} files, {maxSizeMB} MB each
            </span>
          </p>

          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Supported formats: {formatAcceptedTypes(accept)}
          </p>

          {error && (
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-red-500">
              <X className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
