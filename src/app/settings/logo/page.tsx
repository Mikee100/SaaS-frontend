"use client";
import { useEffect, useState, useRef } from "react";
import { apiGet } from "@/utils/api";

export default function LogoSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<any>("/tenant/me").then((data) => {
      setLogoUrl(data.logoUrl || null);
    });
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

  return (
    <div style={{ maxWidth: 400 }}>
      <h2>Logo Upload</h2>
      <form onSubmit={handleUpload}>
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
      </form>
    </div>
  );
} 