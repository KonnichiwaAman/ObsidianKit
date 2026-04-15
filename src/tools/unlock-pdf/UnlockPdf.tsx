import { useState } from "react";
import { AlertCircle, Eye, EyeOff, LockOpen, Key, ShieldCheck } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, formatBytes, toArrayBuffer } from "@/tools/pdf-utils";

type PdfLoadWithPassword = (
  pdf: ArrayBuffer | Uint8Array,
  options?: { password?: string; ignoreEncryption?: boolean },
) => Promise<PDFDocument>;

const loadPdfWithPassword = PDFDocument.load as unknown as PdfLoadWithPassword;

export default function UnlockPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  function handleUpload(files: File[]) {
    setFile(files[0]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setOutputSize(null);
    setPassword("");
  }

  async function handleUnlock() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const cleanPassword = password.trim();

      const pdf = cleanPassword
        ? await loadPdfWithPassword(arrayBuffer, { password: cleanPassword })
        : await loadPdfWithPassword(arrayBuffer);

      const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });

      downloadBlob(blob, `${baseFileName(file.name)}_unlocked.pdf`);
      setOutputSize(blob.size);

      if (cleanPassword) {
        setSuccessMsg("Password removed successfully.");
      } else {
        setSuccessMsg("PDF was accessible and has been re-saved without restrictions.");
      }
    } catch (error) {
      console.error("Unlock failed", error);
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("password") || message.includes("encrypted")) {
          setErrorMsg("Incorrect password or this file requires a password before it can be opened.");
        } else if (message.includes("invalid") || message.includes("corrupt")) {
          setErrorMsg("This PDF appears corrupted or unsupported.");
        } else {
          setErrorMsg("Failed to unlock this PDF.");
        }
      } else {
        setErrorMsg("Failed to unlock this PDF.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">Remove password protection from your PDF files permanently.</p>
      </div>

      {!file ? (
        <PdfUploader onUpload={handleUpload} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview 
             files={[file]} 
             onRemove={() => {
               setFile(null);
               setPassword("");
               setErrorMsg(null);
               setSuccessMsg(null);
               setOutputSize(null);
             }} 
          />
          
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-6">
             <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Document Password</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Key className="h-4 w-4 text-[var(--color-text-muted)]" />
                   </div>
                   <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="If needed, enter the current password"
                      className={`w-full rounded-xl border bg-[var(--color-bg-input)] pl-11 pr-11 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors duration-200 ${errorMsg ? "border-red-500 focus:border-red-500" : "border-[var(--color-border-primary)] focus:border-[var(--color-border-hover)]"}`}
                   />
                   <button
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                   >
                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                </div>
                {errorMsg && <p className="mt-2 text-xs text-red-500">{errorMsg}</p>}
                {!errorMsg && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Leave empty to attempt unlock on already-accessible PDFs.
                  </p>
                )}
             </div>

             <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
               Your PDF is processed entirely on-device and is never uploaded.
             </div>

             <div className="pt-2">
               <button
                 onClick={handleUnlock}
                 disabled={processing}
                 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <LockOpen className="h-4 w-4" />
                 {processing ? "Unlocking..." : "Unlock & Download"}
               </button>
             </div>

             {successMsg && (
               <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 inline-flex items-start gap-2">
                 <ShieldCheck className="h-4 w-4 mt-0.5" />
                 <div>
                   <p>{successMsg}</p>
                   {outputSize !== null && (
                     <p className="text-xs mt-1 text-emerald-200/90">
                       Output size: {formatBytes(outputSize)} (original: {formatBytes(file.size)})
                     </p>
                   )}
                 </div>
               </div>
             )}

             {errorMsg && (
               <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 inline-flex items-start gap-2">
                 <AlertCircle className="h-4 w-4 mt-0.5" />
                 <span>{errorMsg}</span>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
