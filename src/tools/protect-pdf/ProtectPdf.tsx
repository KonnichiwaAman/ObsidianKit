import { useMemo, useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { PdfUploader, PdfPreview } from "@/components/ui/PdfUploader";
import { baseFileName, downloadBlob, formatBytes, toArrayBuffer } from "@/tools/pdf-utils";

export default function ProtectPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [openPassword, setOpenPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [protectedSize, setProtectedSize] = useState<number | null>(null);

  const passwordStrength = useMemo(() => {
    const lengthScore = openPassword.length >= 12 ? 2 : openPassword.length >= 8 ? 1 : 0;
    const varietyScore = Number(/[A-Z]/.test(openPassword)) + Number(/[a-z]/.test(openPassword)) + Number(/\d/.test(openPassword)) + Number(/[^A-Za-z0-9]/.test(openPassword));
    const score = lengthScore + (varietyScore >= 3 ? 2 : varietyScore >= 2 ? 1 : 0);

    if (score >= 4) return { label: "Strong", color: "text-emerald-400" };
    if (score >= 2) return { label: "Medium", color: "text-amber-300" };
    return { label: "Weak", color: "text-red-400" };
  }, [openPassword]);

  function resetForm() {
    setFile(null);
    setOpenPassword("");
    setConfirmPassword("");
    setOwnerPassword("");
    setErrorMessage(null);
    setResultMessage(null);
    setProtectedSize(null);
  }

  async function handleProtect() {
    if (!file) return;
    if (processing) return;

    setErrorMessage(null);
    setResultMessage(null);

    if (openPassword.length < 6) {
      setErrorMessage("Use at least 6 characters for a secure password.");
      return;
    }

    if (openPassword !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setProcessing(true);

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const encryptedBytes = await encryptPDF(
        sourceBytes,
        openPassword,
        ownerPassword.trim() ? ownerPassword.trim() : null,
      );

      const blob = new Blob([toArrayBuffer(encryptedBytes)], { type: "application/pdf" });
      const outputName = `${baseFileName(file.name)}_protected.pdf`;
      downloadBlob(blob, outputName);

      setProtectedSize(blob.size);
      setResultMessage("Password protection applied successfully.");
    } catch (error) {
      console.error("Protect PDF failed", error);
      setErrorMessage("Failed to protect this PDF. The document may be corrupted or unsupported.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Add password protection to your PDF entirely in your browser with no server upload.
        </p>
      </div>

      {!file ? (
        <PdfUploader onUpload={(files) => setFile(files[0] ?? null)} multiple={false} />
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <PdfPreview files={[file]} onRemove={resetForm} />

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
                Open Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--color-text-muted)]" />
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={openPassword}
                  onChange={(event) => setOpenPassword(event.target.value)}
                  placeholder="Enter password required to open this PDF"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] pl-11 pr-12 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <button
                  onClick={() => setShowPasswords((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  title={showPasswords ? "Hide passwords" : "Show passwords"}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={`mt-2 text-xs ${passwordStrength.color}`}>Strength: {passwordStrength.label}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Confirm Password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Owner Password (Optional)
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  placeholder="Optional admin password"
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-3 text-xs text-[var(--color-text-muted)]">
              The open password is required by PDF viewers before the file can be viewed. All encryption happens locally on your device.
            </div>

            <button
              onClick={handleProtect}
              disabled={processing || !openPassword || !confirmPassword}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-8 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="h-4 w-4" />
              {processing ? "Encrypting PDF..." : "Protect & Download"}
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 inline-flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resultMessage && protectedSize !== null && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <p className="font-medium">{resultMessage}</p>
              <p className="text-xs mt-1 text-emerald-200/90">
                Protected file size: {formatBytes(protectedSize)} (original: {formatBytes(file.size)})
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
