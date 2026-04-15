import { useEffect, useState } from "react";
import { Download, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

type ErrorCorrection = "L" | "M" | "Q" | "H";

function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function QrGenerator() {
  const [text, setText] = useState("https://obsidiankit.app");
  const [size, setSize] = useState(320);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrection>("M");
  const [dataUrl, setDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generateQr() {
      if (!text.trim()) {
        setDataUrl("");
        setError(null);
        return;
      }

      setGenerating(true);
      setError(null);

      try {
        const url = await QRCode.toDataURL(text, {
          width: size,
          margin: 1,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        if (!cancelled) {
          setDataUrl(url);
        }
      } catch (qrError) {
        if (!cancelled) {
          setError(qrError instanceof Error ? qrError.message : "Failed to generate QR code");
          setDataUrl("");
        }
      } finally {
        if (!cancelled) {
          setGenerating(false);
        }
      }
    }

    void generateQr();

    return () => {
      cancelled = true;
    };
  }, [text, size, errorCorrection]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Text or URL</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="Enter text, URL, email, or contact payload..."
            className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-hover)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Size (px)</label>
            <input
              type="range"
              min={128}
              max={1024}
              step={32}
              value={size}
              onChange={(event) => setSize(Number.parseInt(event.target.value, 10))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{size}px</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Error Correction</label>
            <select
              value={errorCorrection}
              onChange={(event) => setErrorCorrection(event.target.value as ErrorCorrection)}
              className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
            >
              <option value="L">Low (L)</option>
              <option value="M">Medium (M)</option>
              <option value="Q">Quartile (Q)</option>
              <option value="H">High (H)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <QrCode className="h-4 w-4 text-[var(--color-text-secondary)]" />
            QR Preview
          </p>
          <button
            onClick={() => dataUrl && downloadDataUrl(dataUrl, "qr-code.png")}
            disabled={!dataUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </button>
        </div>

        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-4">
          {generating ? (
            <div className="inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating QR...
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt="Generated QR code" className="max-h-[360px] w-auto" />
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Add text to generate a QR code.</p>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
