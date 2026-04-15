import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, parsePageRanges, toArrayBuffer } from "@/tools/pdf-utils";

type EditMode = "label" | "watermark";
type Position = "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";

function hexToRgb(hex: string) {
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return rgb(0.1, 0.1, 0.1);

  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export default function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("all");
  const [editMode, setEditMode] = useState<EditMode>("label");
  const [text, setText] = useState("");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [fontSize, setFontSize] = useState(22);
  const [opacity, setOpacity] = useState(0.45);
  const [rotation, setRotation] = useState(0);
  const [color, setColor] = useState("#111111");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleUpload(files: File[]) {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const pdf = await PDFDocument.load(await selectedFile.arrayBuffer());
      const total = pdf.getPageCount();
      setPageCount(total);
      setPageInput(`1-${total}`);
    } catch {
      setPageCount(0);
      setPageInput("all");
      setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleApply() {
    if (!file) return;
    if (!text.trim()) {
      setErrorMessage("Please enter text to apply.");
      return;
    }
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const sourceBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(sourceBytes);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pages = pdf.getPages();
      const targetPages = parsePageRanges(pageInput, pages.length);

      if (targetPages.length === 0) {
        setErrorMessage("Please enter a valid page range.");
        return;
      }

      const colorValue = hexToRgb(color);
      const margin = 36;

      for (const pageNumber of targetPages) {
        const page = pages[pageNumber - 1];
        const { width, height } = page.getSize();
        const appliedRotation = editMode === "watermark" ? (rotation === 0 ? 45 : rotation) : rotation;
        const size = editMode === "watermark" ? Math.max(fontSize, Math.min(width, height) / 8) : fontSize;
        const textWidth = font.widthOfTextAtSize(text, size);

        let x = margin;
        let y = margin;

        if (editMode === "watermark") {
          x = (width - textWidth) / 2;
          y = height / 2;
        } else {
          if (position.includes("center")) {
            x = (width - textWidth) / 2;
          } else if (position.includes("right")) {
            x = width - textWidth - margin;
          } else {
            x = margin;
          }

          if (position.startsWith("top")) {
            y = height - margin - size;
          } else if (position.startsWith("bottom")) {
            y = margin;
          } else {
            y = (height - size) / 2;
          }
        }

        page.drawText(text, {
          x,
          y,
          size,
          font,
          rotate: degrees(appliedRotation),
          color: colorValue,
          opacity,
        });
      }

      const outputBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}_edited.pdf`);

      setResultMessage(`${targetPages.length} page${targetPages.length === 1 ? "" : "s"} updated successfully.`);
    } catch (error) {
      console.error("PDF Editor failed", error);
      setErrorMessage("Failed to apply edits to this PDF.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Add labels or watermark text across selected pages with precise style controls.
        </p>
      </div>

      {!file ? (
        <PdfUploader onUpload={handleUpload} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview
            files={[file]}
            onRemove={() => {
              setFile(null);
              setPageCount(0);
              setPageInput("all");
              setErrorMessage(null);
              setResultMessage(null);
            }}
          />

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Edit Mode</label>
              <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1">
                <button
                  onClick={() => setEditMode("label")}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                    editMode === "label"
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  Label
                </button>
                <button
                  onClick={() => setEditMode("watermark")}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                    editMode === "watermark"
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  Watermark
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Pages</label>
                  <span className="text-xs text-[var(--color-text-muted)]">Total: {pageCount || "-"}</span>
                </div>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  placeholder="all or 1-3, 7"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Text Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-[46px] w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Text</label>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                placeholder={editMode === "watermark" ? "CONFIDENTIAL" : "Reviewed by ObsidianKit"}
                className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
              />
            </div>

            {editMode === "label" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Position</label>
                <select
                  value={position}
                  onChange={(event) => setPosition(event.target.value as Position)}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="center">Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Font Size</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={72}
                  step={1}
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Opacity</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Rotation</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  className="w-full accent-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={processing || !text.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {processing ? "Applying edits..." : "Apply & Download"}
            </button>

            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
            {resultMessage && <p className="text-xs text-emerald-400">{resultMessage}</p>}
          </div>

          <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
            This editor is optimized for text stamps and watermark workflows. For full text replacement inside existing PDF content streams, a full WYSIWYG PDF engine is required.
          </div>
        </div>
      )}
    </div>
  );
}
