import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, toArrayBuffer } from "@/tools/pdf-utils";

export default function PdfReorder() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [orderStr, setOrderStr] = useState<string>("");
  const [converting, setConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpload(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setErrorMessage(null);
    try {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        setPageCount(count);
        setOrderStr(`1-${count}`);
    } catch {
        setPageCount(0);
        setOrderStr("");
        setErrorMessage("Unable to read this PDF.");
    }
  }

  function parseOrder(str: string, maxPages: number): number[] {
    const trimmed = str.trim();
    if (!trimmed || maxPages <= 0) return [];

    const tokens = trimmed.split(",").map((segment) => segment.trim()).filter(Boolean);
    const pages: number[] = [];

    for (const token of tokens) {
      if (token.toLowerCase() === "all") {
        for (let page = 1; page <= maxPages; page += 1) {
          pages.push(page - 1);
        }
        continue;
      }

      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

        const step = start <= end ? 1 : -1;
        for (let page = start; step > 0 ? page <= end : page >= end; page += step) {
          if (page >= 1 && page <= maxPages) {
            pages.push(page - 1);
          }
        }
        continue;
      }

      const single = Number(token);
      if (Number.isInteger(single) && single >= 1 && single <= maxPages) {
        pages.push(single - 1);
      }
    }

    return pages;
  }

  async function handleReorder() {
    if (!file || pageCount === 0) return;
    if (converting) return;

    setErrorMessage(null);
    
    const targetPages = parseOrder(orderStr, pageCount);
    if (targetPages.length === 0) {
      setErrorMessage("Please enter a valid page order, such as 3,1,2 or 1-3,6.");
      return;
    }

    setConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const copiedPages = await newPdf.copyPages(pdf, targetPages);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}_reordered.pdf`);
    } catch (error) {
      console.error("Reorder failed.", error);
      setErrorMessage("Failed to reorder pages. Ensure PDF is not encrypted.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Rearrange the pages of your PDF document. Enter the new order separated by commas.</p>
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
               setOrderStr("");
               setErrorMessage(null);
             }} 
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             <div>
                <div className="flex justify-between mb-2">
                   <label className="block text-xs font-medium text-[var(--color-text-secondary)]">New Page Order</label>
                   {pageCount > 0 && <span className="text-xs text-[var(--color-text-primary)] font-medium">Total Pages: {pageCount}</span>}
                </div>
                <input
                   type="text"
                   value={orderStr}
                   onChange={(e) => setOrderStr(e.target.value)}
                   placeholder="e.g. 3, 1, 2, 5, 4"
                   className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                />
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">Use comma-separated pages and ranges. Omitted pages are removed.</p>
             </div>

             <div className="flex flex-wrap gap-2">
               <button
                 onClick={() => setOrderStr(`1-${pageCount}`)}
                 className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
               >
                 Original Order
               </button>
               <button
                 onClick={() => setOrderStr(Array.from({ length: pageCount }, (_, i) => pageCount - i).join(", "))}
                 className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
               >
                 Reverse Order
               </button>
             </div>

             <div className="pt-2">
               <button
                 onClick={handleReorder}
                 disabled={converting || !orderStr.trim() || pageCount === 0}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <ListOrdered className="h-4 w-4" />
                 {converting ? "Processing..." : "Reorder & Download"}
               </button>
             </div>

             {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
