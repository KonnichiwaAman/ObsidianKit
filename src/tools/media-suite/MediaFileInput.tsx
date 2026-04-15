import { useRef, useState } from "react";
import { AlertTriangle, FileUp, UploadCloud, X } from "lucide-react";
import { formatFileSize } from "@/tools/image-utils";
import { getErrorMessage } from "@/tools/image-utils";

interface MediaFileInputProps {
  file: File | null;
  accept: string;
  maxSizeMB: number;
  disabled?: boolean;
  helperText: string;
  onChange: (file: File | null) => void;
}

export function MediaFileInput({
  file,
  accept,
  maxSizeMB,
  disabled = false,
  helperText,
  onChange,
}: MediaFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function validateAndApply(candidate: File | null | undefined) {
    if (!candidate) return;

    try {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (candidate.size > maxBytes) {
        throw new Error(`File exceeds ${maxSizeMB} MB.`);
      }

      setError(null);
      onChange(candidate);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to open this file."));
    }
  }

  function handleDrag(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    validateAndApply(event.dataTransfer.files?.[0]);
  }

  if (file) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{formatFileSize(file.size)}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              onChange(null);
            }}
            className="rounded-full bg-[var(--color-bg-input)] p-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragActive
            ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
            : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)]"
        } ${disabled ? "opacity-70" : "hover:border-[var(--color-border-hover)]"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            validateAndApply(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
          <UploadCloud className="h-7 w-7 text-[var(--color-text-muted)]" />
        </div>

        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="text-blue-500 transition-colors hover:text-blue-600 disabled:opacity-60"
          >
            Select file
          </button>
          {" "}
          or drag and drop
        </p>

        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{helperText}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!error && (
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          <div className="inline-flex items-center gap-1">
            <FileUp className="h-3.5 w-3.5" />
            Max {maxSizeMB} MB
          </div>
        </div>
      )}
    </div>
  );
}
