"use client";
import { useEffect, useState, useRef } from "react";
import { apiGet } from "@/utils/api";
import { FaImage } from 'react-icons/fa';
import Link from "next/link";

export default function LogoSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const data = await apiGet<any>("/tenant/me");
        setLogoUrl(data.logoUrl || null);
      } catch (err) {
        console.error("Error fetching tenant:", err);
        setError("Failed to load tenant settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setSuccess(false);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenant/logo`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      setSuccess(true);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaImage className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Logo</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <form onSubmit={handleUpload}>
        <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
          <div style={{ marginBottom: 16 }}>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {preview && (
            <div style={{ marginBottom: 16 }}>
              <div>Preview:</div>
              <img src={preview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200, border: '1px solid #eee' }} />
            </div>
          )}
          {logoUrl && !preview && (
            <div style={{ marginBottom: 16 }}>
              <div>Current Logo:</div>
              <img src={logoUrl} alt="Current Logo" style={{ maxWidth: 200, maxHeight: 200, border: '1px solid #eee' }} />
            </div>
          )}
          <button type="submit" disabled={!file || uploading} style={{ marginTop: 8 }}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {success && <div style={{ color: "green", marginTop: 8 }}>Logo uploaded!</div>}
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        </div>
      </form>
    </div>
  );
} 