import { useMemo, useRef, useState } from "react";
import * as mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Download, LoaderCircle, UploadCloud, X } from "lucide-react";
import { baseFileName, downloadBlob, toArrayBuffer } from "@/tools/pdf-utils";

type PageSizePreset = "a4" | "letter";

const PAGE_SIZES: Record<PageSizePreset, { width: number; height: number; label: string }> = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  letter: { width: 612, height: 792, label: "Letter" },
};

function wrapTextByWidth(text: string, maxWidth: number, widthOf: (value: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (widthOf(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[index];
    }
  }

  lines.push(current);
  return lines;
}

export default function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [docText, setDocText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<PageSizePreset>("a4");
  const [fontSize, setFontSize] = useState(11);
  const [lineSpacing, setLineSpacing] = useState(1.45);
  const [keepBlankLines, setKeepBlankLines] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const previewText = useMemo(() => docText.slice(0, 3600), [docText]);

  function reset() {
    setFile(null);
    setDocText("");
    setErrorMessage(null);
    setResultMessage(null);
  }

  async function handleFiles(files: FileList | null) {
    const selected = files?.[0] ?? null;
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".docx")) {
      setErrorMessage("Please upload a .docx file.");
      return;
    }

    setFile(selected);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const extracted = await mammoth.extractRawText({ arrayBuffer });
      setDocText(extracted.value.replace(/\r\n/g, "\n"));
    } catch (error) {
      console.error("DOCX parse failed", error);
      setDocText("");
      setErrorMessage("Unable to parse this Word document.");
    }
  }

  async function handleConvert() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      if (!docText.trim()) {
        throw new Error("No text detected in this document.");
      }

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pagePreset = PAGE_SIZES[pageSize];

      const marginX = 52;
      const marginY = 56;
      const lineHeight = Math.max(12, fontSize * lineSpacing);
      const maxLineWidth = pagePreset.width - marginX * 2;

      let page = pdf.addPage([pagePreset.width, pagePreset.height]);
      let y = pagePreset.height - marginY;

      const paragraphs = docText.split("\n");

      for (const rawParagraph of paragraphs) {
        const paragraph = rawParagraph.trim();

        if (!paragraph) {
          if (!keepBlankLines) continue;
          y -= lineHeight;
          if (y < marginY) {
            page = pdf.addPage([pagePreset.width, pagePreset.height]);
            y = pagePreset.height - marginY;
          }
          continue;
        }

        const lines = wrapTextByWidth(paragraph, maxLineWidth, (value) => font.widthOfTextAtSize(value, fontSize));
        for (const line of lines) {
          if (y < marginY) {
            page = pdf.addPage([pagePreset.width, pagePreset.height]);
            y = pagePreset.height - marginY;
          }

          page.drawText(line, {
            x: marginX,
            y,
            size: fontSize,
            font,
            color: rgb(0.12, 0.12, 0.12),
          });
          y -= lineHeight;
        }

        y -= lineHeight * 0.25;
      }

      const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}.pdf`);

      setResultMessage("Word document converted to PDF successfully.");
    } catch (error) {
      console.error("Word to PDF failed", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to convert this file.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Convert DOCX files into clean, readable PDFs with adjustable layout controls.
        </p>
      </div>

      {!file ? (
        <div
          className="relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-12 transition-colors hover:border-[var(--color-border-hover)]"
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              void handleFiles(event.target.files);
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
              <UploadCloud className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-blue-500 hover:text-blue-600 focus:outline-none focus:underline"
                >
                  Click to upload
                </button>{" "}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Supported format: DOCX</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 relative">
            <button
              onClick={reset}
              className="absolute right-4 top-4 rounded-full bg-[var(--color-bg-input)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Selected Document</h3>
            <p className="text-sm text-[var(--color-text-primary)] truncate">{file.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(event.target.value as PageSizePreset)}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="a4">{PAGE_SIZES.a4.label}</option>
                  <option value="letter">{PAGE_SIZES.letter.label}</option>
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Font Size</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={15}
                  step={1}
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Line Spacing</label>
                <span className="text-xs text-[var(--color-text-muted)]">{lineSpacing.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.2}
                max={1.9}
                step={0.05}
                value={lineSpacing}
                onChange={(event) => setLineSpacing(Number(event.target.value))}
                className="w-full accent-[var(--color-text-primary)]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={keepBlankLines}
                onChange={(event) => setKeepBlankLines(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border-primary)]"
              />
              Preserve blank lines from source text
            </label>

            <button
              onClick={handleConvert}
              disabled={processing || !docText.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {processing ? "Converting..." : "Convert to PDF & Download"}
            </button>

            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
            {resultMessage && <p className="text-xs text-emerald-400">{resultMessage}</p>}
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Extract Preview</h3>
            <textarea
              value={previewText || "No text extracted from this DOCX yet."}
              readOnly
              rows={10}
              className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
        This conversion prioritizes clean readable output from DOCX text content. Complex shapes and exact Office layout fidelity may vary by document.
      </div>
    </div>
  );
}
