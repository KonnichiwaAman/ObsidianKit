import { useState } from "react";
import { Scissors } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, parsePageRanges, toArrayBuffer } from "@/tools/pdf-utils";

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [ranges, setRanges] = useState<string>("1");
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
        setRanges(`1-${count}`); // default to all pages initially
    } catch {
        setPageCount(0);
        setRanges("");
        setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleSplit() {
    if (!file || pageCount === 0) return;
    if (converting) return;
    
    setErrorMessage(null);

    const targetPages = parsePageRanges(ranges, pageCount);
    if (targetPages.length === 0) {
      setErrorMessage("Please enter a valid page range.");
      return;
    }

    setConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const targetIndices = targetPages.map((page) => page - 1);

      const copiedPages = await newPdf.copyPages(pdf, targetIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}_extracted.pdf`);

    } catch (error) {
      console.error("Split failed.", error);
      setErrorMessage("Failed to extract pages. Ensure PDF is not encrypted.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Extract specific pages from a PDF document to create a new, smaller file.</p>
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
               setRanges("1");
               setErrorMessage(null);
             }} 
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             <div>
                <div className="flex justify-between mb-2">
                   <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Pages to extract</label>
                   {pageCount > 0 && <span className="text-xs text-[var(--color-text-primary)] font-medium">Total: {pageCount}</span>}
                </div>
                <input
                   type="text"
                   value={ranges}
                   onChange={(e) => setRanges(e.target.value)}
                   placeholder="e.g. 1-3, 5, 8-11"
                   className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                />
             </div>

             <div className="pt-2">
               <button
                 onClick={handleSplit}
                 disabled={converting || !ranges.trim() || pageCount === 0}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Scissors className="h-4 w-4" />
                 {converting ? "Processing..." : "Extract Pages & Download"}
               </button>
             </div>

             {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
