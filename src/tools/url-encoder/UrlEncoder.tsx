import { useMemo, useState } from "react";
import { Copy, Check, ArrowRightLeft } from "lucide-react";

type Mode = "encode" | "decode";
type EncodingStyle = "component" | "full-uri";

export default function UrlEncoder() {
  const [mode, setMode] = useState<Mode>("encode");
  const [style, setStyle] = useState<EncodingStyle>("component");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) {
      return {
        output: "",
        error: null as string | null,
      };
    }

    try {
      const output =
        mode === "encode"
          ? style === "component"
            ? encodeURIComponent(input)
            : encodeURI(input)
          : style === "component"
            ? decodeURIComponent(input)
            : decodeURI(input);

      return {
        output,
        error: null as string | null,
      };
    } catch (urlError) {
      return {
        output: "",
        error: urlError instanceof Error ? urlError.message : "Unable to process URL text",
      };
    }
  }, [mode, style, input]);

  async function handleCopy() {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1">
        <button
          onClick={() => setMode("encode")}
          className={`flex-1 rounded-md px-4 py-2 text-xs font-medium ${mode === "encode" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
        >
          Encode
        </button>
        <button
          onClick={() => setMode("decode")}
          className={`flex-1 rounded-md px-4 py-2 text-xs font-medium ${mode === "decode" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
        >
          Decode
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Encoding Style</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => setStyle("component")}
            className={`rounded-lg border px-3 py-2 text-xs ${style === "component" ? "border-[var(--color-border-hover)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)]"}`}
          >
            URI Component (query value)
          </button>
          <button
            onClick={() => setStyle("full-uri")}
            className={`rounded-lg border px-3 py-2 text-xs ${style === "full-uri" ? "border-[var(--color-border-hover)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)]"}`}
          >
            Full URI (whole URL)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            {mode === "encode" ? "Plain Text" : "Encoded Text"}
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={12}
            placeholder="Paste text here..."
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {mode === "encode" ? "Encoded Result" : "Decoded Result"}
            </label>
            <button
              onClick={handleCopy}
              disabled={!result.output}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            value={result.output}
            readOnly
            rows={12}
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
          />
          {result.error && <p className="text-xs text-red-500">{result.error}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
        <p className="inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Tip: use URI Component mode for query parameters, and Full URI mode for whole links.
        </p>
      </div>
    </div>
  );
}
