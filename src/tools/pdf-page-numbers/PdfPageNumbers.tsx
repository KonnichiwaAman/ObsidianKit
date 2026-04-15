import { useState } from "react";
import { Hash } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, parsePageRanges, toArrayBuffer } from "@/tools/pdf-utils";

type NumberingFormat = "n" | "n_of_total" | "page_n";
type NumberingPosition = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";

export default function PdfPageNumbers() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [target, setTarget] = useState<"all" | "range">("all");
  const [ranges, setRanges] = useState("1");
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [format, setFormat] = useState<NumberingFormat>("n");
  const [position, setPosition] = useState<NumberingPosition>("bottom-center");
  const [converting, setConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpload(files: File[]) {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    setErrorMessage(null);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const total = pdf.getPageCount();
      setPageCount(total);
      setRanges(`1-${total}`);
      setStartFrom(1);
    } catch {
      setPageCount(0);
      setRanges("1");
      setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleAddNumbers() {
    if (!file) return;
    if (converting) return;

    setErrorMessage(null);

    if (startFrom < 1) {
      setErrorMessage("Start number must be at least 1.");
      return;
    }

    setConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const selectedPageNumbers = target === "all"
        ? Array.from({ length: pages.length }, (_, index) => index + 1)
        : parsePageRanges(ranges, pages.length);

      if (selectedPageNumbers.length === 0) {
        setErrorMessage("Please enter a valid page range.");
        return;
      }

      const total = selectedPageNumbers.length;

      selectedPageNumbers.forEach((pageNumber, index) => {
          const page = pages[pageNumber - 1];
          const n = startFrom + index;
          let text = `${n}`;
          if (format === "n_of_total") text = `${n} of ${startFrom + total - 1}`;
          if (format === "page_n") text = `Page ${n}`;

          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const { width, height } = page.getSize();
          
          let x = 0;
          let y = 0;
          const margin = 30;

          // X position
          if (position.includes("center")) x = (width - textWidth) / 2;
          else if (position.includes("right")) x = width - textWidth - margin;
          else if (position.includes("left")) x = margin;

          // Y position (pdf-lib 0,0 is bottom-left)
          if (position.includes("bottom")) y = margin;
          else if (position.includes("top")) y = height - margin - fontSize;

          page.drawText(text, {
              x,
              y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
          });
      });

      const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}_numbered.pdf`);
    } catch (error) {
      console.error("Numbering failed.", error);
      setErrorMessage("Failed to add page numbers. Ensure PDF is not encrypted.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Automatically add page numbers to your PDF document in various formats and positions.</p>
      </div>

      {!file ? (
        <PdfUploader onUpload={handleUpload} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview files={[file]} onRemove={() => {
            setFile(null);
            setPageCount(0);
            setRanges("1");
            setErrorMessage(null);
          }} />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             <div>
                <label className="mb-3 block text-xs font-medium text-[var(--color-text-secondary)]">Pages to number</label>
                <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1 mb-4">
                   <button
                     onClick={() => setTarget("all")}
                     className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                       target === "all"
                         ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                         : "text-[var(--color-text-muted)]"
                     }`}
                   >
                     All Pages
                   </button>
                   <button
                     onClick={() => setTarget("range")}
                     className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                       target === "range"
                         ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)]"
                         : "text-[var(--color-text-muted)]"
                     }`}
                   >
                     Specific Pages
                   </button>
                </div>

                {target === "range" && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Page Range</label>
                      <span className="text-xs text-[var(--color-text-muted)]">Total: {pageCount || "-"}</span>
                    </div>
                    <input
                      type="text"
                      value={ranges}
                      onChange={(event) => setRanges(event.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                    />
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                 <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Format</label>
                    <select
                       value={format}
                       onChange={(e) => setFormat(e.target.value as NumberingFormat)}
                       className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                    >
                       <option value="n">1, 2, 3</option>
                       <option value="page_n">Page 1, Page 2...</option>
                       <option value="n_of_total">1 of N</option>
                    </select>
                 </div>
                 <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Position</label>
                    <select
                       value={position}
                       onChange={(e) => setPosition(e.target.value as NumberingPosition)}
                       className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                    >
                       <option value="bottom-center">Bottom Center</option>
                       <option value="bottom-right">Bottom Right</option>
                       <option value="bottom-left">Bottom Left</option>
                       <option value="top-center">Top Center</option>
                       <option value="top-right">Top Right</option>
                       <option value="top-left">Top Left</option>
                    </select>
                 </div>
             </div>

             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
               <div>
                 <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Start Number</label>
                 <input
                   type="number"
                   min={1}
                   value={startFrom}
                   onChange={(event) => setStartFrom(Number(event.target.value))}
                   className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                 />
               </div>

               <div>
                 <div className="mb-2 flex items-center justify-between">
                   <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Font Size</label>
                   <span className="text-xs text-[var(--color-text-muted)]">{fontSize}px</span>
                 </div>
                 <input
                   type="range"
                   min={8}
                   max={24}
                   step={1}
                   value={fontSize}
                   onChange={(event) => setFontSize(Number(event.target.value))}
                   className="w-full accent-[var(--color-text-primary)]"
                 />
               </div>
             </div>

             <div className="pt-2">
               <button
                 onClick={handleAddNumbers}
                 disabled={converting}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Hash className="h-4 w-4" />
                 {converting ? "Processing..." : "Add Page Numbers"}
               </button>
             </div>

             {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
