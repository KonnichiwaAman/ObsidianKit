import { useState } from "react";
import { Download, RotateCcw, RotateCw } from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, parsePageRanges, toArrayBuffer } from "@/tools/pdf-utils";

export default function PdfRotator() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [target, setTarget] = useState<"all" | "range">("all");
  const [ranges, setRanges] = useState<string>("");
  const [rotation, setRotation] = useState<90 | 180 | 270>(90); // default to Right 90
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
      setRanges(`1-${count}`);
    } catch {
        setPageCount(0);
      setRanges("");
      setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleRotate() {
    if (!file || pageCount === 0) return;
   if (converting) return;

   setErrorMessage(null);
    setConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      let targetIndices = new Set<number>();
      if (target === "all") {
         targetIndices = new Set(pages.map((_, i) => i));
      } else {
       targetIndices = new Set(parsePageRanges(ranges, pageCount).map((page) => page - 1));
         if (targetIndices.size === 0) {
         setErrorMessage("No valid pages selected.");
            return;
         }
      }

      for (let i = 0; i < pages.length; i++) {
         if (targetIndices.has(i)) {
             const page = pages[i];
             const currentRotation = page.getRotation().angle;
             page.setRotation(degrees((currentRotation + rotation) % 360));
         }
      }

         const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
         const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
         downloadBlob(blob, `${baseFileName(file.name)}_rotated.pdf`);
    } catch (error) {
      console.error("Rotate failed.", error);
         setErrorMessage("Failed to rotate pages. Ensure PDF is not encrypted.");
      } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Rotate all pages or specific pages of your PDF document without losing quality.</p>
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
                      setRanges("");
                      setErrorMessage(null);
                   }} 
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             
             <div>
                 <label className="mb-3 block text-xs font-medium text-[var(--color-text-secondary)]">Pages to rotate</label>
                 <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1 mb-4">
                    <button
                      onClick={() => setTarget("all")}
                      className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                        target === "all" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
                      }`}
                    >
                       All Pages
                    </button>
                    <button
                      onClick={() => setTarget("range")}
                      className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                        target === "range" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
                      }`}
                    >
                       Specific Pages
                    </button>
                 </div>

                 {target === "range" && (
                    <div className="animate-in slide-in-from-top-2">
                        <div className="flex justify-between mb-2">
                           <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Page Range</label>
                           {pageCount > 0 && <span className="text-xs text-[var(--color-text-primary)] font-medium">Total: {pageCount}</span>}
                        </div>
                        <input
                           type="text"
                           value={ranges}
                           onChange={(e) => setRanges(e.target.value)}
                           placeholder="e.g. 1-3, 5"
                           className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)] transition-colors duration-200"
                        />
                    </div>
                 )}
             </div>

             <div>
                <label className="mb-3 block text-xs font-medium text-[var(--color-text-secondary)]">Direction</label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                   <button
                      onClick={() => setRotation(270)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all ${rotation === 270 ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"}`}
                   >
                      <RotateCcw className="h-5 w-5" />
                      <span className="text-xs font-medium">Left (-90°)</span>
                   </button>
                   <button
                      onClick={() => setRotation(90)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all ${rotation === 90 ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"}`}
                   >
                      <RotateCw className="h-5 w-5" />
                      <span className="text-xs font-medium">Right (+90°)</span>
                   </button>
                   <button
                      onClick={() => setRotation(180)}
                      className={`flex sm:col-span-1 col-span-2 flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all ${rotation === 180 ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"}`}
                   >
                      <RotateCw className="h-5 w-5 rotate-180" />
                      <span className="text-xs font-medium">Upside Down (180°)</span>
                   </button>
                </div>
             </div>

             <div className="pt-4">
               <button
                 onClick={handleRotate}
                 disabled={converting || (target === "range" && !ranges.trim())}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Download className="h-4 w-4" />
                 {converting ? "Processing..." : "Rotate & Download"}
               </button>
             </div>

                   {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
