"use client";
import React, { useState } from 'react';
import { FaUpload, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: boolean; count?: number; errors?: string[] } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/bulk-upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-branch-id': 'default',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const data = await response.json();
      setResult({ success: true, count: data.length || data.count || 0 });
      onSuccess(data.length || data.count || 0);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setResult({ success: false, errors: [error.message] });
      } else {
        setResult({ success: false, errors: ['Unknown error during bulk upload'] });
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Products</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Upload Instructions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Download the template Excel file to see the required format</li>
                <li>• Required columns: Name, SKU, Price</li>
                <li>• Optional columns: Cost, Stock, Description</li>
                <li>• Upload .xlsx or .xls files only</li>
                <li>• Maximum 1000 products per upload</li>
              </ul>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FaUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <label
                  htmlFor="bulk-file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700"
                >
                  Choose Excel File
                </label>
                <input
                  id="bulk-file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <p className="text-sm text-gray-500">or drag and drop here</p>
              </div>
            </div>

            {/* Progress */}
            {uploading && uploadProgress !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <FaCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Upload Successful' : 'Upload Failed'}
                  </span>
                </div>

                {result.success && result.count && (
                  <p className="text-sm text-green-800">
                    Successfully uploaded {result.count} product{result.count !== 1 ? 's' : ''}.
                  </p>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
