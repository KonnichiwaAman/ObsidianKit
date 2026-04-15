import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, FileImage, X } from "lucide-react";

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
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

export function ImageUploader({ onUpload, accept = "image/*", maxSizeMB = 10 }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const processFile = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Max size is ${maxSizeMB}MB.`);
      return;
    }

    if (!isFileAccepted(file, accept)) {
      setError(`Invalid file type. Accepted types: ${formatAcceptedTypes(accept)}.`);
      return;
    }

    onUpload(file);
  };

  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed
        p-12 transition-all duration-200 ease-in-out
        ${dragActive ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)]"}
        ${error ? "border-red-500/50 bg-red-500/5" : ""}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
          <UploadCloud className={`h-8 w-8 ${dragActive ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-blue-500 hover:text-blue-600 focus:outline-none focus:underline"
            >
              Click to upload
            </button>{" "}
            or drag and drop
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Supported formats: {formatAcceptedTypes(accept)}
          </p>
        </div>
        {error && (
          <div className="mt-2 flex items-center justify-center text-xs font-medium text-red-500">
            <X className="mr-1 h-3 w-3" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function ImagePreview({ file, onClear }: { file: File; onClear: () => void }) {
  const [erroredPreviewUrl, setErroredPreviewUrl] = useState<string | null>(null);

  const isUnsupportedPreviewType = /\.(heic|heif)$/i.test(file.name) || file.type === "application/pdf";
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canShowImagePreview = !isUnsupportedPreviewType && erroredPreviewUrl !== previewUrl;

  return (
    <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
      <button
        onClick={onClear}
        className="absolute right-4 top-4 rounded-full bg-[var(--color-bg-input)] p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border-primary)] hover:text-[var(--color-text-primary)]"
      >
        <X className="h-4 w-4" />
      </button>
      
      {previewUrl && (
         <div className="flex items-center justify-center bg-[var(--color-bg-input)] rounded-lg overflow-hidden h-48 w-full mb-4">
             {/* Render img if it's a known browser-supported format */}
             {canShowImagePreview ? (
                 <img
                   key={previewUrl}
                   src={previewUrl}
                   alt="Preview"
                   className="max-h-full max-w-full object-contain"
                   onError={() => setErroredPreviewUrl(previewUrl)}
                 />
             ) : (
                <div className="flex flex-col items-center text-[var(--color-text-muted)]">
                   <FileImage className="h-12 w-12 mb-2 opacity-50" />
                   <span className="text-xs">Preview unavailable for this format</span>
                </div>
             )}
         </div>
      )}

      <div className="flex items-center justify-between w-full text-sm">
         <div className="flex items-center space-x-2 truncate">
            <FileImage className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">{file.name}</span>
         </div>
         <span className="text-[var(--color-text-secondary)]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    </div>
  );
}
