"use client";
import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { FaUpload, FaImage, FaTrash } from 'react-icons/fa';
import { apiPost } from '@/utils/api';
import Image from 'next/image';

interface LogoUploaderProps {
  onUpload: (url: string) => void;
  initialLogo?: string;
  className?: string;
}

export default function LogoUploader({ onUpload, initialLogo, className = "" }: LogoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialLogo || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await apiPost<{ url: string }>('/tenant/logo', formData);
      const url = response.url;
      setPreview(url);
      onUpload(url);
    } catch {
      setError('Failed to upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-lg p-6 ${className} ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {preview ? (
        <div className="flex flex-col items-center space-y-4">
          <Image
            src={preview}
            alt="Logo Preview"
            width={128}
            height={128}
            className="max-w-32 max-h-32 object-contain rounded-lg"
          />
          <div className="flex gap-2">
            <button
              onClick={handleClick}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FaUpload />
              Replace Logo
            </button>
            <button
              onClick={handleRemove}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FaTrash />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className="flex flex-col items-center justify-center cursor-pointer text-center"
        >
          <FaImage className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-1">Drop your logo here or click to browse</p>
          <p className="text-sm text-gray-500">Supports JPG, PNG, SVG. Max 5MB</p>
        </div>
      )}

      {uploading && <p className="text-center text-blue-600 mt-4">Uploading...</p>}
      {error && <p className="text-center text-red-600 mt-4">{error}</p>}
    </div>
  );
}
