import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CaseConverter() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toSentenceCase(str: string) {
    return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
  }

  function toTitleCase(str: string) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function toAlternatingCase(str: string) {
    return str.split("").map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())).join("");
  }

  function toInverseCase(str: string) {
    return str.split("").map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
  }

  const actions = [
    { label: "Sentence case", fn: () => setText(toSentenceCase(text)) },
    { label: "lower case", fn: () => setText(text.toLowerCase()) },
    { label: "UPPER CASE", fn: () => setText(text.toUpperCase()) },
    { label: "Title Case", fn: () => setText(toTitleCase(text)) },
    { label: "aLtErNaTiNg cAsE", fn: () => setText(toAlternatingCase(text)) },
    { label: "InVeRsE CaSe", fn: () => setText(toInverseCase(text)) },
  ];

  return (
    <div className="space-y-6">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here to convert case..."
        rows={10}
        className="w-full resize-y rounded-xl border border-[var(--color-border-primary)]
                   bg-[var(--color-bg-input)] px-5 py-4 text-sm leading-relaxed
                   text-[var(--color-text-primary)] outline-none
                   placeholder:text-[var(--color-text-muted)]
                   focus:border-[var(--color-border-hover)]
                   transition-colors duration-200"
      />

      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.fn}
            disabled={!text}
            className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                       px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)]
                       transition-all duration-200 hover:border-[var(--color-border-hover)]
                       hover:text-[var(--color-text-primary)] disabled:opacity-40
                       disabled:cursor-not-allowed cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleCopy}
          disabled={!text}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-text-primary)]
                     px-5 py-2.5 text-xs font-semibold text-[var(--color-bg-primary)]
                     transition-opacity duration-200 hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Text"}
        </button>
        <button
          onClick={() => setText("")}
          disabled={!text}
          className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                     px-5 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]
                     transition-all duration-200 hover:border-[var(--color-border-hover)]
                     hover:text-[var(--color-text-primary)] disabled:opacity-40
                     disabled:cursor-not-allowed cursor-pointer"
        >
          Clear
        </button>
      </div>
      
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-5 py-3">
        <span className="text-sm text-[var(--color-text-secondary)]">
          Character Count
        </span>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {text.length}
        </span>
      </div>
    </div>
  );
}
