import { useState } from "react";
import { Copy, Check, FileJson, Minus, Trash2 } from "lucide-react";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function formatJson(spaces: number = 2) {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, spaces));
      setError(null);
    } catch (e) {
      if (e instanceof Error) {
        setError("Invalid JSON: " + e.message);
      } else {
        setError("Invalid JSON");
      }
      setOutput("");
    }
  }

  function minifyJson() {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      if (e instanceof Error) {
        setError("Invalid JSON: " + e.message);
      } else {
        setError("Invalid JSON");
      }
      setOutput("");
    }
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            Input JSON
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"key": "value"}'
            rows={16}
            className={`w-full resize-y rounded-xl border bg-[var(--color-bg-input)] px-5 py-4 text-sm font-mono leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-hover)] transition-colors duration-200 ${
              error ? "border-red-500/50 focus:border-red-500" : "border-[var(--color-border-primary)]"
            }`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Output
            </label>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Formatted result will appear here..."
            rows={16}
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)]
                       bg-[var(--color-bg-card)] px-5 py-4 text-sm font-mono leading-relaxed
                       text-[var(--color-text-primary)] outline-none
                       placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => formatJson(2)}
          disabled={!input}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-text-primary)]
                     px-5 py-2.5 text-xs font-semibold text-[var(--color-bg-primary)]
                     transition-opacity duration-200 hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <FileJson className="h-4 w-4" />
          Format (2 spaces)
        </button>
        <button
          onClick={() => formatJson(4)}
          disabled={!input}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] disabled:opacity-40
                     disabled:cursor-not-allowed cursor-pointer"
        >
          Format (4 spaces)
        </button>
        <button
          onClick={minifyJson}
          disabled={!input}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] disabled:opacity-40
                     disabled:cursor-not-allowed cursor-pointer"
        >
          <Minus className="h-4 w-4" />
          Minify
        </button>
        <button
          onClick={() => { setInput(""); setOutput(""); setError(null); }}
          disabled={!input && !output}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] disabled:opacity-40
                     disabled:cursor-not-allowed cursor-pointer ml-auto"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
