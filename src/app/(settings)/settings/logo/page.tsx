"use client";
import { useEffect, useState, useRef } from "react";
import { apiGet, apiPut, apiDelete } from "@/utils/api";
import { FaImage, FaUpload, FaTrash, FaCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import Link from "next/link";

interface LogoConfig {
  mainLogo?: string;
  favicon?: string;
  receiptLogo?: string;
  etimsQrCode?: string;
  watermark?: string;
}

interface LogoValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export default function LogoSettings() {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({});
  const [preview, setPreview] = useState<{ [key: string]: string }>({});
  const [file, setFile] = useState<{ [key: string]: File | null }>({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ [key: string]: LogoValidation }>({});
  const [activeTab, setActiveTab] = useState<string>('main');
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [loading, setLoading] = useState(true);

  const logoTypes = {
    main: {
      label: 'Main Logo',
      description: 'Primary logo displayed in the header and branding',
      required: true,
      maxSize: 2, // MB
      dimensions: { width: 200, height: 80 },
      formats: ['png', 'jpg', 'jpeg', 'svg']
    },
    favicon: {
      label: 'Favicon',
      description: 'Small icon displayed in browser tabs',
      required: false,
      maxSize: 0.5, // MB
      dimensions: { width: 32, height: 32 },
      formats: ['ico', 'png']
    },
    receiptLogo: {
      label: 'Receipt Logo',
      description: 'Logo displayed on receipts and invoices',
      required: false,
      maxSize: 1, // MB
      dimensions: { width: 150, height: 60 },
      formats: ['png', 'jpg', 'jpeg']
    },
    etimsQrCode: {
      label: 'KRA eTIMS QR Code',
      description: 'QR code for KRA eTIMS compliance (required for Kenya)',
      required: true,
      maxSize: 1, // MB
      dimensions: { width: 200, height: 200 },
      formats: ['png', 'jpg', 'jpeg']
    },
    watermark: {
      label: 'Watermark',
      description: 'Subtle watermark for documents',
      required: false,
      maxSize: 1, // MB
      dimensions: { width: 300, height: 150 },
      formats: ['png', 'jpg', 'jpeg']
    }
  };

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const data = await apiGet<any>("/tenant/me");
        setLogoConfig({
          mainLogo: data.logoUrl || null,
          favicon: data.favicon || null,
          receiptLogo: data.receiptLogo || null,
          etimsQrCode: data.etimsQrUrl || null,
          watermark: data.watermark || null
        });
      } catch (err) {
        console.error("Error fetching tenant:", err);
        setError("Failed to load tenant settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, []);

  const validateFile = (file: File, type: string): LogoValidation => {
    const config = logoTypes[type as keyof typeof logoTypes];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.maxSize) {
      errors.push(`File size must be less than ${config.maxSize}MB`);
    }

    // Check file format
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!config.formats.includes(extension || '')) {
      errors.push(`File must be one of: ${config.formats.join(', ')}`);
    }

    // Check if required
    if (config.required && !file) {
      errors.push(`${config.label} is required`);
    }

    // Validate image dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > config.dimensions.width || img.height > config.dimensions.height) {
          warnings.push(`Recommended size: ${config.dimensions.width}x${config.dimensions.height}px`);
        }
        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };
      img.onerror = () => {
        errors.push('Invalid image file');
        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile({ ...file, [type]: f });
      setPreview({ ...preview, [type]: URL.createObjectURL(f) });
      setSuccess(false);
      setError(null);

      // Validate file
      const validation = await validateFile(f, type);
      setValidation({ ...validation, [type]: validation });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const filesToUpload = Object.entries(file).filter(([_, f]) => f !== null);
    
    if (filesToUpload.length === 0) return;
    
    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      for (const [type, file] of filesToUpload) {
        if (!file) continue;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/tenant/logo`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Upload failed for ${type}`);
        }

        const data = await res.json();
        setLogoConfig(prev => ({ ...prev, [type]: data.logoUrl }));
      }

      setSuccess(true);
      setFile({});
      setPreview({});
      setValidation({});
      
      // Clear file inputs
      Object.values(inputRefs.current).forEach(ref => {
        if (ref) ref.value = "";
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async (type: string) => {
    try {
      await apiPut("/tenant/me", { [type]: null });
      setLogoConfig(prev => ({ ...prev, [type]: null }));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getValidationStatus = (type: string) => {
    const val = validation[type];
    if (!val) return null;
    
    if (!val.isValid) {
      return { type: 'error', icon: FaExclamationTriangle, color: 'text-red-500' };
    }
    if (val.warnings.length > 0) {
      return { type: 'warning', icon: FaInfoCircle, color: 'text-yellow-500' };
    }
    return { type: 'success', icon: FaCheck, color: 'text-green-500' };
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaImage className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Logo Management</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">
          Logo updated successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Logo Types Tabs */}
      <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(logoTypes).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.label}
              {config.required && <span className="text-red-500 ml-1">*</span>}
            </button>
          ))}
        </div>

        {/* Active Tab Content */}
        {Object.entries(logoTypes).map(([key, config]) => (
          <div key={key} className={activeTab === key ? 'block' : 'hidden'}>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{config.label}</h3>
              <p className="text-gray-600 mb-4">{config.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FaUpload className="mx-auto text-3xl text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      {config.required ? 'Required' : 'Optional'} • Max {config.maxSize}MB • {config.formats.join(', ')}
                    </p>
                    <input
                      ref={el => inputRefs.current[key] = el}
                      type="file"
                      accept={config.formats.map(f => `.${f}`).join(',')}
                      onChange={(e) => handleFileChange(e, key)}
                      className="hidden"
                      id={`file-${key}`}
                    />
                    <label
                      htmlFor={`file-${key}`}
                      className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Choose File
                    </label>
                  </div>

                  {/* Validation Messages */}
                  {validation[key] && (
                    <div className="mt-4">
                      {validation[key].errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-red-600 text-sm mb-1">
                          <FaExclamationTriangle className="w-4 h-4" />
                          {error}
                        </div>
                      ))}
                      {validation[key].warnings.map((warning, index) => (
                        <div key={index} className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
                          <FaInfoCircle className="w-4 h-4" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview Section */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Preview</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {preview[key] ? (
                      <img
                        src={preview[key]}
                        alt={`${config.label} preview`}
                        className="max-w-full h-auto max-h-32 object-contain"
                      />
                    ) : logoConfig[key as keyof LogoConfig] ? (
                      <div className="text-center">
                        <img
                          src={logoConfig[key as keyof LogoConfig] || ''}
                          alt={`Current ${config.label}`}
                          className="max-w-full h-auto max-h-32 object-contain mx-auto"
                        />
                        <button
                          onClick={() => handleRemoveLogo(key)}
                          className="mt-2 text-red-600 hover:text-red-700 text-sm flex items-center gap-1 mx-auto"
                        >
                          <FaTrash className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <FaImage className="mx-auto text-2xl mb-2" />
                        <p className="text-sm">No {config.label.toLowerCase()} uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Upload Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading || Object.keys(file).filter(k => file[k]).length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FaUpload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Selected Logos'}
          </button>
        </div>
      </div>

      {/* Logo Usage Guidelines */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">Logo Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">Main Logo</h4>
            <ul className="space-y-1">
              <li>• Used in header, branding, and main UI</li>
              <li>• Recommended: 200x80px, PNG/SVG preferred</li>
              <li>• Required for professional appearance</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">KRA eTIMS QR Code</h4>
            <ul className="space-y-1">
              <li>• Required for Kenya tax compliance</li>
              <li>• Must be valid QR code from KRA</li>
              <li>• Used on receipts and invoices</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Receipt Logo</h4>
            <ul className="space-y-1">
              <li>• Displayed on receipts and invoices</li>
              <li>• Should be high contrast for printing</li>
              <li>• Recommended: 150x60px</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Favicon</h4>
            <ul className="space-y-1">
              <li>• Small icon for browser tabs</li>
              <li>• Should be simple and recognizable</li>
              <li>• Recommended: 32x32px, ICO/PNG</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 