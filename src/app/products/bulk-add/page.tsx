"use client";
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { FaUpload, FaCheck, FaTimes, FaArrowLeft, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { apiGet } from '@/utils/api';
import { useBranch } from "@/contexts/BranchContext";
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import AuthGuard from '@/components/AuthGuard';
import API_BASE_URL from '../../../config/apiConfig';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface ProductPreview {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  supplierId?: string;
  supplierName?: string;
  errors: string[];
  isValid: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

const BulkAddProductsPage: React.FC = () => {
  const { user } = useUser();
  const { selectedBranchId } = useBranch();
  const { data: planLimits } = usePlanLimits();
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [rawData, setRawData] = useState<(string | number | boolean | null | undefined)[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    name: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    description: '',
    supplierId: ''
  });

  // Permission checks
  const canCreateProducts = hasPermission(user, 'create_products');

  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    try {
      const data = await apiGet<Supplier[]>('/suppliers');
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  }, []);

  React.useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Store raw data and headers
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as (string | number | boolean | null | undefined)[][];

        setHeaders(headers);
        setRawData(rows);

        // Auto-map common field names with improved logic
        const autoMapping: Record<string, string> = {};
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase().trim();
          if (lowerHeader.includes('name') || lowerHeader.includes('product') || lowerHeader.includes('item')) {
            autoMapping.name = header;
          } else if (lowerHeader.includes('partnumber') || lowerHeader.includes('part number') || lowerHeader.includes('part')) {
            // Partnumber is likely the SKU
            autoMapping.sku = header;
          } else if (lowerHeader.includes('sku') || lowerHeader.includes('code') || lowerHeader.includes('reference')) {
            autoMapping.sku = header;
          } else if (lowerHeader.includes('price') && lowerHeader.includes('usd')) {
            // Price USD is likely the selling price
            autoMapping.price = header;
          } else if (lowerHeader.includes('price') || lowerHeader.includes('selling') || lowerHeader.includes('sale')) {
            autoMapping.price = header;
          } else if (lowerHeader.includes('cost') || lowerHeader.includes('purchase') || lowerHeader.includes('buy')) {
            autoMapping.cost = header;
          } else if (lowerHeader.includes('stock') || lowerHeader.includes('quantity') || lowerHeader.includes('qty')) {
            autoMapping.stock = header;
          } else if (lowerHeader.includes('description') || lowerHeader.includes('desc') || lowerHeader.includes('detail')) {
            autoMapping.description = header;
          }
          // Note: We don't auto-map supplier from file, users will select it manually
        });

        setFieldMapping(prev => ({ ...prev, ...autoMapping }));
        setShowFieldMapping(true);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing the uploaded file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFieldMappingSubmit = () => {
    // Process data based on field mapping
    const processedProducts: ProductPreview[] = rawData.map((row, index) => {
      const product: Record<string, string | number | boolean | null | undefined> = {};
      headers.forEach((header, colIndex) => {
        product[header] = row[colIndex];
      });

      const errors: string[] = [];
      const id = `temp-${index}`;

      // Map fields based on user selection and ensure string type
      const name = fieldMapping.name ? String(product[fieldMapping.name] ?? '') : '';
      const sku = fieldMapping.sku ? String(product[fieldMapping.sku] ?? '') : '';
      const price = fieldMapping.price ? parseFloat(String(product[fieldMapping.price] ?? '')) : 0;
      const cost = fieldMapping.cost ? parseFloat(String(product[fieldMapping.cost] ?? '')) : 0;
      const stock = fieldMapping.stock ? parseInt(String(product[fieldMapping.stock] ?? '')) : 0;
      const description = fieldMapping.description ? String(product[fieldMapping.description] ?? '') : '';
      const supplierId = fieldMapping.supplierId ? String(product[fieldMapping.supplierId] ?? '') : selectedSupplier || '';

      // Validate required fields
      if (!name || name === '') errors.push('Name is required');
      if (!sku || sku === '') errors.push('SKU is required');
      if (!price || isNaN(price)) errors.push('Valid price is required');
      // Stock is optional - if not provided, it defaults to 0

      return {
        id,
        name: name || '',
        sku: sku || '',
        price: price || 0,
        cost: cost || 0,
        stock: stock || 0,
        description: description || '',
        supplierId: supplierId || '',
        supplierName: suppliers.find(s => s.id === supplierId)?.name || '',
        errors,
        isValid: errors.length === 0
      };
    });

    setProducts(processedProducts);
    setShowFieldMapping(false);
    setShowPreview(true);
  };

  const handleUpload = async () => {
    const validProducts = products.filter(p => p.isValid);
    if (validProducts.length === 0) {
      alert('No valid products to upload');
      return;
    }

    // Check if upload would exceed product limits
    if (planLimits) {
      const currentUsage = planLimits.usage.products.current;
      const limit = planLimits.usage.products.limit;
      const newTotal = currentUsage + validProducts.length;

      if (newTotal > limit) {
        alert(`Upload would exceed your product limit. Current: ${currentUsage}/${limit}, Attempting to add: ${validProducts.length}`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create Excel file from valid products
      const ws = XLSX.utils.json_to_sheet(validProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        description: p.description,
        supplierId: p.supplierId
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const formData = new FormData();
      formData.append('file', blob, 'products.xlsx');

      const response = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...(selectedBranchId && { 'x-branch-id': selectedBranchId })
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      // Check if limit was exceeded
      if (result.limitExceeded) {
        alert(`Upload blocked: ${result.summary.errors[0]}`);
        return;
      }

      setUploadResults({
        success: result.summary?.successful || 0,
        failed: result.summary?.failed || 0,
        errors: result.summary?.errors || []
      });

      // Reset form
      setProducts([]);
      setShowPreview(false);
      setUploadProgress(100);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 2000);
    }
  };

  if (!canCreateProducts) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to create products.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Add Products</h1>
              <p className="text-gray-600">Upload multiple products at once using Excel</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {!showPreview && !showFieldMapping && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <FaUpload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Products</h2>
              <p className="text-gray-600 mb-6">
                Upload an Excel file (.xlsx) with your product data. The system will automatically detect and map your columns.
              </p>

              {/* Plan Limits Warning */}
              {planLimits && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center gap-2 text-blue-800">
                    <FaExclamationTriangle className="w-5 h-5" />
                    <span className="font-medium">Product Limit: {planLimits.usage.products.current}/{planLimits.usage.products.limit}</span>
                  </div>
                  {planLimits.usage.products.current / planLimits.usage.products.limit >= 0.8 && (
                    <p className="text-gray-600 mb-4">You don&apos;t have permission to create products.</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                
              </div>
            </div>
          </div>
        )}

        {/* Field Mapping Section */}
        {showFieldMapping && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Map Your Columns</h2>
              <p className="text-gray-600">
                We found {headers.length} columns in your file. Please map them to the required product fields.
              </p>
            </div>

            {/* Supplier Selection */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Supplier for All Products (Optional)
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- No Supplier Selected --</option>
                {suppliers.length === 0 ? (
                  <option value="" disabled>
                    No suppliers available. You can add suppliers later.
                  </option>
                ) : (
                  suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {suppliers.length === 0
                  ? "No suppliers found. You can add suppliers in the Suppliers section and assign them to products later."
                  : "All products will be assigned to this supplier. You can change individual suppliers later."
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {Object.entries(fieldMapping).filter(([field]) => field !== 'supplierId').map(([field, mappedColumn]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                    {field} {field === 'name' || field === 'sku' || field === 'price' || field === 'stock' ? '*' : ''}
                  </label>
                  <select
                    value={mappedColumn}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map((header, index) => (
                      <option key={index} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowFieldMapping(false);
                  setHeaders([]);
                  setRawData([]);
                  setSelectedSupplier('');
                  setFieldMapping({
                    name: '',
                    sku: '',
                    price: '',
                    cost: '',
                    stock: '',
                    description: '',
                    supplierId: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Back to Upload
              </button>
              <button
                onClick={handleFieldMappingSubmit}
                disabled={!fieldMapping.name || !fieldMapping.sku || !fieldMapping.price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Continue to Preview
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Upload Preview</h2>
                  <p className="text-gray-600">
                    {products.filter(p => p.isValid).length} valid products, {products.filter(p => !p.isValid).length} with errors
                  </p>

                  {/* Upload Limit Check */}
                  {planLimits && (() => {
                    const validCount = products.filter(p => p.isValid).length;
                    const currentUsage = planLimits.usage.products.current;
                    const limit = planLimits.usage.products.limit;
                    const newTotal = currentUsage + validCount;
                    const wouldExceed = newTotal > limit;
                    const approachingLimit = (newTotal / limit) >= 0.8;

                    return (
                      <div className={`mt-3 p-3 rounded-lg ${wouldExceed ? 'bg-red-50 border border-red-200' : approachingLimit ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="flex items-center gap-2">
                          {wouldExceed ? (
                            <FaTimes className="w-4 h-4 text-red-600" />
                          ) : approachingLimit ? (
                            <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <FaCheck className="w-4 h-4 text-green-600" />
                          )}
                          <span className={`text-sm font-medium ${wouldExceed ? 'text-red-800' : approachingLimit ? 'text-yellow-800' : 'text-green-800'}`}>
                            After upload: {newTotal}/{limit} products
                          </span>
                        </div>
                        {wouldExceed && (
                          <p className="text-xs text-red-700 mt-1">
                            This upload would exceed your plan limit. Please reduce the number of products or upgrade your plan.
                          </p>
                        )}
                        {approachingLimit && !wouldExceed && (
                          <p className="text-xs text-yellow-700 mt-1">
                            This upload will bring you close to your product limit.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={
                      !!(
                        uploading ||
                        products.filter(p => p.isValid).length === 0 ||
                        (planLimits && (() => {
                          const validCount = products.filter(p => p.isValid).length;
                          const currentUsage = planLimits.usage.products.current;
                          const limit = planLimits.usage.products.limit;
                          return currentUsage + validCount > limit;
                        })())
                      )
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaUpload className="w-4 h-4" />}
                    Upload Products
                  </button>
                </div>
              </div>
            </div>

            {/* Progress */}
            {uploadProgress !== null && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading products...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {uploadResults && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{uploadResults.success}</div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>

                {/* Updated Usage Info */}
                {planLimits && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center gap-2 text-blue-800">
                      <FaCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Updated Product Count: {(planLimits.usage.products.current + uploadResults.success)}/{planLimits.usage.products.limit}
                      </span>
                    </div>
                  </div>
                )}

                {uploadResults.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Cost</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Stock</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product.id} className={product.isValid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-4 py-3">
                          {product.isValid ? (
                            <FaCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FaTimes className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-3 text-gray-600">{product.sku}</td>
                        <td className="px-4 py-3 text-gray-600">${product.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-600">${product.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-600">{product.stock}</td>
                        <td className="px-4 py-3 text-gray-600">{product.supplierName || '-'}</td>
                        <td className="px-4 py-3">
                          {product.errors.length > 0 && (
                            <div className="text-red-600 text-xs">
                              {product.errors.join(', ')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
      
    </AuthGuard>
  );
};

export default BulkAddProductsPage;
