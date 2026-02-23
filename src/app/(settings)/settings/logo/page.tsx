"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiGet, apiPut } from "@/utils/api";
import API_BASE_URL from "@/config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import {
  FaImage,
  FaUpload,
  FaTrash,
  FaGlobe,
  FaReceipt,
  FaFileAlt,
  FaShieldAlt,
  FaCopy,
  FaCheck,
  FaTimes,
  FaInfoCircle,
} from "react-icons/fa";
import Link from "next/link";
import { useUser } from "@/components/UserContext";

const LOGO_TYPE_TO_BACKEND_FIELD: Record<string, string> = {
  mainLogo: "logoUrl",
  favicon: "favicon",
  receiptLogo: "receiptLogo",
  etimsQrCode: "etimsQrUrl",
  watermark: "watermark",
};

function logoTypeToBackendType(type: string): string {
  return type === "mainLogo" ? "main" : type;
}

function logoFullUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

interface LogoConfig {
  mainLogo?: string | null;
  favicon?: string | null;
  receiptLogo?: string | null;
  etimsQrCode?: string | null;
  watermark?: string | null;
}

interface TenantData {
  logoUrl?: string;
  favicon?: string;
  receiptLogo?: string;
  etimsQrUrl?: string;
  watermark?: string;
}

const LOGO_TYPES = {
  mainLogo: {
    label: "Main logo",
    description: "Primary branding across the app",
    where: ["Sidebar & header", "Login screen", "Emails", "PDFs"],
    icon: FaGlobe,
    required: true,
    maxSizeMB: 2,
    formats: ["png", "jpg", "jpeg", "svg"],
    spec: "200×80px recommended",
  },
  favicon: {
    label: "Favicon",
    description: "Browser tab and bookmarks",
    where: ["Browser tab", "Bookmarks", "PWA icon"],
    icon: FaImage,
    required: false,
    maxSizeMB: 0.5,
    formats: ["ico", "png"],
    spec: "32×32px",
  },
  receiptLogo: {
    label: "Receipt & invoice logo",
    description: "Printed and digital receipts",
    where: ["Receipts", "Invoices", "Sales history"],
    icon: FaReceipt,
    required: false,
    maxSizeMB: 1,
    formats: ["png", "jpg", "jpeg"],
    spec: "150×60px, high contrast",
  },
  etimsQrCode: {
    label: "KRA eTIMS QR code",
    description: "Tax compliance (Kenya)",
    where: ["Receipts", "Invoices", "eTIMS compliance"],
    icon: FaShieldAlt,
    required: true,
    maxSizeMB: 1,
    formats: ["png", "jpg", "jpeg"],
    spec: "200×200px QR",
  },
  watermark: {
    label: "Watermark",
    description: "Subtle branding on documents",
    where: ["PDFs", "Exports", "Documents"],
    icon: FaFileAlt,
    required: false,
    maxSizeMB: 1,
    formats: ["png", "jpg", "jpeg"],
    spec: "300×150px, semi-transparent",
  },
} as const;

export default function LogoSettings() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({});
  const canEditEtims = !!user?.isSuperadmin;
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyEverywhereLoading, setApplyEverywhereLoading] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const invalidateTenant = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tenant"] });
  }, [queryClient]);

  const fetchTenant = useCallback(async () => {
    try {
      const data = await apiGet<TenantData>("/tenant/me");
      setLogoConfig({
        mainLogo: data.logoUrl ?? null,
        favicon: data.favicon ?? null,
        receiptLogo: data.receiptLogo ?? null,
        etimsQrCode: data.etimsQrUrl ?? null,
        watermark: data.watermark ?? null,
      });
    } catch (err) {
      console.error("Error fetching tenant:", err);
      setError("Failed to load logo settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  async function handleUpload(type: keyof LogoConfig, file: File) {
    const key = type as string;
    setUploading(key);
    setError(null);
    setSuccess(null);

    const base = API_BASE_URL.replace(/\/+$/, "");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", logoTypeToBackendType(key));

    try {
      const res = await fetch(`${base}/tenant/logo`, {
        method: "POST",
        credentials: "include",
        headers:
          typeof window !== "undefined" && localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed for ${LOGO_TYPES[key as keyof typeof LOGO_TYPES]?.label ?? key}`);
      }

      const data = await res.json();
      setLogoConfig((prev) => ({ ...prev, [type]: data.logoUrl }));
      setSuccess(`${LOGO_TYPES[key as keyof typeof LOGO_TYPES]?.label ?? key} updated`);
      invalidateTenant();
      if (inputRefs.current[key]) inputRefs.current[key].value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleRemove(type: keyof LogoConfig) {
    const backendField = LOGO_TYPE_TO_BACKEND_FIELD[type as string];
    if (!backendField) return;
    setError(null);
    setSuccess(null);
    try {
      await apiPut("/tenant/me", { [backendField]: null });
      setLogoConfig((prev) => ({ ...prev, [type]: null }));
      setSuccess(`${LOGO_TYPES[type as keyof typeof LOGO_TYPES]?.label ?? type} removed`);
      invalidateTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo");
    }
  }

  async function handleUseMainEverywhere() {
    const main = logoConfig.mainLogo;
    if (!main) {
      setError("Upload a main logo first.");
      return;
    }
    setApplyEverywhereLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPut("/tenant/me", {
        receiptLogo: main,
        favicon: main,
      });
      setLogoConfig((prev) => ({
        ...prev,
        receiptLogo: main,
        favicon: main,
      }));
      setSuccess("Main logo is now used in receipts and browser tab.");
      invalidateTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setApplyEverywhereLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[320px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  const mainLogoSet = !!logoConfig.mainLogo;
  const canUseEverywhere = mainLogoSet;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <FaImage className="text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logos & branding</h1>
            <p className="text-slate-600 text-sm mt-0.5">These logos appear across your entire platform.</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
        >
          ← All settings
        </Link>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
          <FaCheck className="text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="ml-auto p-1 rounded hover:bg-emerald-100"
            aria-label="Dismiss"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-800 border border-red-200">
          <FaTimes className="text-red-600 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto p-1 rounded hover:bg-red-100"
            aria-label="Dismiss"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global effect */}
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <FaGlobe className="text-2xl text-slate-300" />
          <h2 className="text-lg font-semibold">Global effect</h2>
        </div>
        <p className="text-slate-300 text-sm mb-6 max-w-2xl">
          Logos you set here are used everywhere: sidebar, receipts, invoices, browser tab, and documents.
          Changes apply across the app for all users in your organization.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
          {(["Sidebar & header", "Receipts & invoices", "Browser tab", "PDFs & documents", "Compliance"] as const).map((area) => (
            <div
              key={area}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              {area}
            </div>
          ))}
        </div>
      </section>

      {/* Use main logo everywhere */}
      {canUseEverywhere && (
        <div className="mb-8 flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <FaCopy className="text-slate-500" />
            <div>
              <p className="font-medium text-slate-800">Use main logo everywhere</p>
              <p className="text-sm text-slate-600">Copy main logo to receipt and favicon for consistent branding.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseMainEverywhere}
            disabled={applyEverywhereLoading}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
          >
            {applyEverywhereLoading ? "Applying…" : "Apply"}
          </button>
        </div>
      )}

      {/* Logo cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(LOGO_TYPES) as [keyof LogoConfig, (typeof LOGO_TYPES)[keyof typeof LOGO_TYPES]][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            const currentUrl = logoConfig[key];
            const isUploading = uploading === key;

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition-shadow"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {config.label}
                      {config.required && <span className="text-red-500 text-xs">Required</span>}
                      {isEtims && !canEditThis && <span className="text-amber-600 text-xs">(View only — admin can edit)</span>}
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">{config.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {config.where.map((w) => (
                        <span
                          key={w}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5"
                        >
                          <FaInfoCircle className="w-3 h-3 opacity-70" />
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 min-h-[100px] flex flex-col items-center justify-center">
                    {currentUrl ? (
                      <>
                        <div className="relative w-full aspect-video max-h-24 rounded overflow-hidden bg-white">
                          <img
                            src={logoFullUrl(currentUrl)}
                            alt={`Current ${config.label}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {canEditThis && (
                          <div className="mt-3 flex items-center gap-2 w-full justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemove(key)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {canEditThis ? (
                          <>
                        <p className="text-xs text-slate-500 mb-2">{config.spec}</p>
                        <p className="text-xs text-slate-400 mb-2">
                          {config.formats.join(", ")} · max {config.maxSizeMB}MB
                        </p>
                        <input
                          ref={(el) => {
                            inputRefs.current[key] = el;
                          }}
                          type="file"
                          accept={config.formats.map((f) => `.${f}`).join(",")}
                          className="hidden"
                          id={`file-${key}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(key, f);
                          }}
                          disabled={!!isUploading}
                        />
                        <label
                          htmlFor={`file-${key}`}
                          className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            isUploading
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-slate-800 text-white hover:bg-slate-700"
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-400 border-t-white rounded-full" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <FaUpload className="w-3.5 h-3.5" />
                              Choose file
                            </>
                          )}
                        </label>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 text-center">Only an administrator can add the KRA eTIMS QR code (Superadmin → Tenants → this tenant → Business &amp; KRA).</p>
                        )}
                      </>
                    )}
                  </div>

                  {currentUrl && canEditThis && (
                    <div className="flex justify-center">
                      <input
                        ref={(el) => {
                          inputRefs.current[key] = el;
                        }}
                        type="file"
                        accept={config.formats.map((f) => `.${f}`).join(",")}
                        className="hidden"
                        id={`replace-${key}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(key, f);
                        }}
                        disabled={!!isUploading}
                      />
                      <label
                        htmlFor={`replace-${key}`}
                        className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition ${
                          isUploading ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {isUploading ? (
                          "Uploading…"
                        ) : (
                          <>
                            <FaUpload className="w-3 h-3" />
                            Replace
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-2">Tips</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• Main logo is shown in the sidebar and across the app—use a clear, recognizable image.</li>
          <li>• Receipt logo is used on printed and PDF receipts; high contrast works best.</li>
          <li>• Favicon should be simple and readable at 32×32px.</li>
          <li>• After changing logos, refresh the page or navigate away and back to see updates everywhere.</li>
        </ul>
      </div>
    </div>
  );
}
