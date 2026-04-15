import { useEffect, useRef, useState } from "react";
import { Copy, Check, Upload, ArrowRightLeft, Download } from "lucide-react";

export default function Base64Encoder() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeReaderRef = useRef<FileReader | null>(null);
  const copyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (activeReaderRef.current && activeReaderRef.current.readyState === FileReader.LOADING) {
        activeReaderRef.current.abort();
      }

      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  function handleProcess() {
    setError(null);
    if (!input) {
      setOutput("");
      return;
    }

    try {
      if (mode === "encode") {
        // Handle utf-8 encoding properly without deprecation warnings
        const bytes = new TextEncoder().encode(input);
        const binString = Array.from(bytes, (byte) =>
          String.fromCodePoint(byte)
        ).join("");
        setOutput(btoa(binString));
      } else {
        const binString = atob(input.trim());
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        setOutput(new TextDecoder().decode(bytes));
      }
    } catch {
      setError(`Failed to ${mode}. Ensure your input is valid.`);
      setOutput("");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeReaderRef.current && activeReaderRef.current.readyState === FileReader.LOADING) {
      activeReaderRef.current.abort();
    }

    setFileName(file.name);
    const reader = new FileReader();
    activeReaderRef.current = reader;
    
    if (mode === "encode") {
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(",")[1] || event.target?.result as string;
        setInput("Data from file loaded");
        setOutput(base64String);
        setError(null);
        activeReaderRef.current = null;
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        setInput(event.target?.result as string);
        setError(null);
        activeReaderRef.current = null;
      };
      reader.readAsText(file);
    }

    reader.onerror = () => {
      setError("Failed to read the selected file.");
      setOutput("");
      activeReaderRef.current = null;
    };

    reader.onabort = () => {
      activeReaderRef.current = null;
    };
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  async function handleCopy() {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);

      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Failed to copy output to clipboard.");
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "encode" ? "encoded.txt" : "decoded.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1">
        {(["encode", "decode"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setInput("");
              setOutput("");
              setError(null);
              setFileName(null);
            }}
            className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
              mode === m
                ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
            }`}
          >
            {m === "encode" ? "Encode to Base64" : "Decode from Base64"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {mode === "encode" ? "Plain Text Input" : "Base64 Input"}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">
                {fileName}
              </span>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload File
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFileName(null);
            }}
            placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            rows={10}
            className={`w-full resize-y rounded-xl border bg-[var(--color-bg-input)] px-5 py-4 text-sm font-mono leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-hover)] transition-colors duration-200 ${
              error ? "border-red-500/50 focus:border-red-500" : "border-[var(--color-border-primary)]"
            }`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {mode === "encode" ? "Base64 Output" : "Plain Text Output"}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                disabled={!output}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Result will appear here..."
            rows={10}
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-card)] px-5 py-4 text-sm font-mono leading-relaxed
                       text-[var(--color-text-primary)] outline-none break-all
                       placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleProcess}
          disabled={!input && !fileName}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-text-primary)]
                     px-8 py-3 text-sm font-semibold text-[var(--color-bg-primary)]
                     transition-opacity duration-200 hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowRightLeft className="h-4 w-4" />
          {mode === "encode" ? "Encode" : "Decode"}
        </button>
      </div>
    </div>
  );
}
