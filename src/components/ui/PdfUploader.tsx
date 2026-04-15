import { useState, useRef } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

interface PdfUploaderProps {
  onUpload: (files: File[]) => void;
  multiple?: boolean;
  maxSizeMB?: number;
}

export function PdfUploader({ onUpload, multiple = false, maxSizeMB = 50 }: PdfUploaderProps) {
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    
    if (validFiles.length === 0) {
       setError("Please select valid PDF files.");
       return;
    }

    if (!multiple && validFiles.length > 1) {
       setError("Please select only one file.");
       return;
    }

    for (const f of validFiles) {
       if (f.size > maxSizeMB * 1024 * 1024) {
          setError(`File ${f.name} is too large. Max size is ${maxSizeMB}MB.`);
          return;
       }
    }

    onUpload(multiple ? validFiles : [validFiles[0]]);
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
        accept="application/pdf,.pdf"
        multiple={multiple}
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
              Click to upload {multiple ? "files" : "file"}
            </button>{" "}
            or drag and drop
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Supported format: PDF
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

export function PdfPreview({ files, onRemove, onClearAll }: { files: File[], onRemove: (index: number) => void, onClearAll?: () => void }) {
  if (files.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 relative">
       {onClearAll && files.length > 1 && (
           <button
             onClick={onClearAll}
             className="absolute right-4 top-4 text-xs font-medium text-red-500 hover:text-red-600"
           >
              Clear All
           </button>
       )}
       <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Selected Documents</h3>
       <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {files.map((f, i) => (
             <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3">
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className="rounded bg-red-500/10 p-2">
                       <FileText className="h-5 w-5 text-red-500" />
                   </div>
                   <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{f.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                   </div>
                </div>
                <button
                   onClick={() => onRemove(i)}
                   className="ml-4 rounded-full bg-[var(--color-bg-card)] p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                >
                   <X className="h-4 w-4" />
                </button>
             </div>
          ))}
       </div>
    </div>
  );
}
