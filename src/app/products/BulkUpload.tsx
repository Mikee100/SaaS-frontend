"use client";
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FaUpload } from 'react-icons/fa';

interface BulkUploadProps {
  onUploadSuccess: (count: number) => void;
  onUploadError: (error: string) => void;
}

const BulkUpload: React.FC<BulkUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setUploadProgress(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ProductRow>(worksheet);

      // Validate and transform data
      type ProductRow = {
        Name?: string;
        SKU?: string;
        Price?: string | number;
        Cost?: string | number;
        Stock?: string | number;
        Description?: string;
      };

      const products = (jsonData as ProductRow[]).map((row) => ({
        name: row['Name'] || '',
        sku: row['SKU'] || '',
        price: parseFloat(row['Price'] as string) || 0,
        cost: parseFloat(row['Cost'] as string) || 0,
        stock: parseInt(row['Stock'] as string) || 0,
        description: row['Description'] || '',
      }));

      // Upload products in batches
      const batchSize = 20;
      let uploadedCount = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const response = await fetch('/api/products/bulk-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ products: batch }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        uploadedCount += batch.length;
        setUploadProgress(Math.round((uploadedCount / products.length) * 100));
      }

      onUploadSuccess(uploadedCount);
     } catch (error: unknown) {
      if (error instanceof Error) {
        onUploadError(error.message);
      } else {
        onUploadError('Unknown error during bulk upload');
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setFileName(null);
      if (e.target) e.target.value = '';
    }
  };

 
  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-white">
      <label
        htmlFor="bulk-upload"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700"
      >
        <FaUpload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Bulk Upload Products'}
      </label>
      <input
        id="bulk-upload"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      {uploadProgress !== null && (
        <div className="mt-2 text-sm text-gray-700">Progress: {uploadProgress}%</div>
      )}
      {fileName && !uploading && (
        <div className="mt-2 text-sm text-gray-700">Selected file: {fileName}</div>
      )}
    </div>
  );
};

export default BulkUpload;
