"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { setupMfa, enableMfa, AuthUser } from "@/lib/auth-client";
import {
  FaSpinner,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheck,
  FaCopy,
} from "react-icons/fa";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

export default function MfaSetupPage() {
  const router = useRouter();
  const { mfaStep, completeMfaLogin } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [enrolledUser, setEnrolledUser] = useState<AuthUser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mfaStep !== "enroll") {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const data = await setupMfa();
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setSecret(data.secret);
      } catch (err: any) {
        setError(err?.message || "Failed to start MFA enrollment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mfaStep, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await enableMfa(code.trim());
      setBackupCodes(result.backupCodes);
      setEnrolledUser(result.user);
    } catch (err: any) {
      setError(err?.message || "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyBackupCodes = useCallback(() => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [backupCodes]);

  const handleContinue = async () => {
    if (!enrolledUser) {
      router.push("/login");
      return;
    }
    await completeMfaLogin(enrolledUser);
  };

  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <FaShieldAlt className="text-xl text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Set up two-factor authentication</h2>
                <p className="text-sm text-slate-500">Required for admin accounts.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start">
                <FaExclamationTriangle className="mr-2 mt-0.5 flex-shrink-0 text-amber-600" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FaSpinner className="animate-spin mr-2" /> Preparing enrollment…
              </div>
            ) : backupCodes ? (
              <div>
                <p className="text-sm text-slate-700 mb-3">
                  Save these backup codes somewhere safe. Each can be used once if you lose access to your authenticator app. They will not be shown again.
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm grid grid-cols-2 gap-2 mb-3">
                  {backupCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                  {copied ? "Copied" : "Copy codes"}
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  I&apos;ve saved these, continue
                </button>
              </div>
            ) : (
              <div>
                {qrCodeDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan with your authenticator app"
                    className="mx-auto mb-4 h-44 w-44 rounded-xl border border-slate-200"
                  />
                )}
                <p className="text-xs text-center text-slate-500 mb-4">
                  Scan with Google Authenticator, 1Password, or similar. Can&apos;t scan?{" "}
                  <span className="font-mono break-all">{secret}</span>
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-center text-lg tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20"
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-3" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Enable two-factor authentication</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}
