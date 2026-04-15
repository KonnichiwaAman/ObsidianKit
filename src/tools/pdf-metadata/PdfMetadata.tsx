import { useState } from "react";
import { Download } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, toArrayBuffer } from "@/tools/pdf-utils";

export default function PdfMetadata() {
  const [file, setFile] = useState<File | null>(null);
  
  // Metadata state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [creator, setCreator] = useState("");
  const [producer, setProducer] = useState("");

  const [converting, setConverting] = useState(false);
  const [action, setAction] = useState<"edit" | "clear">("edit");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpload(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setErrorMessage(null);
    
    try {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        
        setTitle(pdf.getTitle() || "");
        setAuthor(pdf.getAuthor() || "");
        setSubject(pdf.getSubject() || "");
        setKeywords(pdf.getKeywords() || "");
        setCreator(pdf.getCreator() || "");
        setProducer(pdf.getProducer() || "");
    } catch {
        setErrorMessage("Unable to read this PDF.");
    }
  }

  async function handleSave() {
    if (!file) return;
    if (converting) return;

    setErrorMessage(null);
    setConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      if (action === "clear") {
          pdf.setTitle("");
          pdf.setAuthor("");
          pdf.setSubject("");
            pdf.setKeywords([]);
          pdf.setCreator("");
          pdf.setProducer("");
      } else {
          pdf.setTitle(title);
          pdf.setAuthor(author);
          pdf.setSubject(subject);
          pdf.setKeywords(keywords.split(",").map(k => k.trim()).filter(Boolean));
          pdf.setCreator(creator);
          pdf.setProducer(producer);
      }

      pdf.setModificationDate(new Date());

      const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${baseFileName(file.name)}_meta.pdf`);
    } catch (error) {
      console.error("Save failed.", error);
      setErrorMessage("Failed to modify metadata. Ensure PDF is not encrypted.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">View, edit, or remove invisible metadata properties from your PDF documents.</p>
      </div>

      {!file ? (
        <PdfUploader onUpload={handleUpload} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview 
             files={[file]} 
             onRemove={() => {
               setFile(null);
               setErrorMessage(null);
             }} 
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             <div className="flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1 mb-4">
                <button
                  onClick={() => setAction("edit")}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                    action === "edit" ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-hover)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
                  }`}
                >
                   Edit Metadata
                </button>
                <button
                  onClick={() => setAction("clear")}
                  className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                    action === "clear" ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
                  }`}
                >
                   Clear All Meta
                </button>
             </div>

             {action === "edit" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2">
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
                       <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Author</label>
                       <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Subject</label>
                       <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Keywords (comma separated)</label>
                       <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Creator App</label>
                       <input type="text" value={creator} onChange={(e) => setCreator(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                   <div>
                       <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Producer</label>
                       <input type="text" value={producer} onChange={(e) => setProducer(e.target.value)} className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]" />
                   </div>
                </div>
             )}

             {action === "clear" && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center animate-in slide-in-from-top-2">
                   <p className="text-sm font-medium text-red-500">All identifying metadata attributes will be entirely wiped.</p>
                </div>
             )}

             <div className="pt-2">
               <button
                 onClick={handleSave}
                 disabled={converting}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Download className="h-4 w-4" />
                 {converting ? "Saving..." : "Save & Download"}
               </button>
             </div>

             {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
