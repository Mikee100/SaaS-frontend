"use client";
import { useEffect, useState } from "react";
import { apiPost, apiDelete, apiPut } from "@/utils/api";
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      setProducts(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/products", {
        ...form,
        price: parseFloat(form.price),
      });
      setShowModal(false);
      setForm({});
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editProduct) {
        await apiPut(`/products/${editProduct.id}`, {
          ...form,
          price: parseFloat(form.price),
        });
        setEditProduct(null);
      }
      setShowModal(false);
      setForm({});
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(product: Product) {
    setEditProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      description: product.description || "",
    });
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiDelete(`/products/${id}`);
    fetchProducts();
  }

  async function handleBulkUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setUploadResult(null);
    setUploadError("");
    setUploadProgress(0);
    const formData = new FormData();
    const fileInput = (e.target as HTMLFormElement).file as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      setUploadError("Please select a file.");
      setUploading(false);
      setUploadProgress(null);
      return;
    }
    formData.append("file", fileInput.files[0]);
    try {
      // Use XMLHttpRequest for upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/products/bulk-upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 30)); // 0-30% for upload
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            setUploadResult(data.summary);
            // Start polling for backend progress
            if (data.uploadId) {
              pollBackendProgress(data.uploadId, data.summary.length);
            } else {
              setUploadProgress(100);
              setTimeout(() => setUploadProgress(null), 1500);
            }
            fetchProducts();
            resolve();
          } else {
            setUploadError("Bulk upload failed");
            setUploadProgress(null);
            reject(new Error("Bulk upload failed"));
          }
        };
        xhr.onerror = () => {
          setUploadError("Bulk upload failed");
          setUploadProgress(null);
          reject(new Error("Bulk upload failed"));
        };
        xhr.send(formData);
      });
    } catch (err: any) {
      setUploadError(err.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function pollBackendProgress(uploadId: string, totalRows: number) {
    let finished = false;
    while (!finished) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/bulk-upload-progress/${uploadId}`);
        if (!res.ok) break;
        const progress = await res.json();
        if (progress && progress.total) {
          // 30-100% for backend processing
          const percent = 30 + Math.round((progress.processed / progress.total) * 70);
          setUploadProgress(percent);
          if (progress.processed >= progress.total) {
            finished = true;
            setTimeout(() => setUploadProgress(null), 1500);
          }
        } else {
          finished = true;
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(null), 1500);
        }
      } catch {
        finished = true;
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 1500);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  function downloadTemplate() {
    // Create a simple template with required fields
    const ws = XLSX.utils.json_to_sheet([
      { name: "Sample Product", sku: "SKU001", price: 10.99, description: "Sample desc", stock: 100, customField1: "value" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product-upload-template.xlsx");
  }

  async function handleClearAll() {
    if (!confirm("Are you sure you want to delete ALL products? This cannot be undone.")) return;
    setClearMsg("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/clear-all`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to clear products");
      const data = await res.json();
      setClearMsg(`Deleted ${data.deletedCount} products.`);
      fetchProducts();
    } catch (err: any) {
      setClearMsg(err.message || "Failed to clear products");
    }
  }

  const filteredProducts = (products || []).filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Helper to flatten product fields for table display
  function flattenProduct(product: any) {
    return { ...product, ...(product.customFields || {}) };
  }

  // Dynamically determine all unique columns (excluding id, createdAt, updatedAt, tenantId, and customFields)
  const allColumnsSet = new Set<string>();
  (products || []).forEach((p) => {
    Object.keys(flattenProduct(p)).forEach((k) => {
      if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'customFields'].includes(k)) {
        allColumnsSet.add(k);
      }
    });
  });
  const allColumns = Array.from(allColumnsSet);

  const editableColumns = allColumns.filter(
    (col) => !['id', 'createdAt', 'updatedAt', 'tenantId'].includes(col)
  );

  if (loading || products === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Management</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your product catalog with ease. Upload bulk data, track inventory, and maintain your product information all in one place.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${products.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(products.map(p => p.name?.split(' ')[0] || 'Other')).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
              </button>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {clearMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{clearMsg}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload</h3>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel File</label>
                <input 
                  type="file" 
                  name="file" 
                  accept=".xlsx" 
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  required 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors" 
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Excel
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={downloadTemplate} 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Template
                </button>
              </div>
            </div>
            
            {uploadProgress !== null && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {uploadProgress < 100 ? `Processing... ${uploadProgress}%` : 'Upload complete!'}
                </p>
              </div>
            )}
            
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            )}
            
            {uploadResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Upload Results</h4>
                <div className="max-h-40 overflow-auto space-y-1">
                  {uploadResult.map((r: any, i: number) => (
                    <div key={i} className={`text-sm ${r.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      Row {i + 2}: {r.status === 'success' ? '✓ Success' : `✗ Error: ${r.error}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Products ({filteredProducts.length} total, showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {allColumns.map((col) => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentProducts.map((p) => {
                  const flat = flattenProduct(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      {allColumns.map((col) => (
                        <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {col.toLowerCase().includes('price') && flat[col] !== undefined 
                            ? `$${parseFloat(flat[col]).toFixed(2)}`
                            : flat[col] !== undefined ? flat[col] : ''
                          }
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditModal(p)} 
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editProduct ? 'Edit Product' : 'Add Product'}
                </h3>
              </div>
              <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="p-6 space-y-4">
                {editableColumns.map((col) => (
                  <div key={col}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type={col.toLowerCase().includes('price') ? 'number' : 'text'}
                      placeholder={col}
                      value={form[col] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [col]: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={['name', 'sku', 'price'].includes(col)}
                      min={col.toLowerCase().includes('price') ? '0' : undefined}
                      step={col.toLowerCase().includes('price') ? '0.01' : undefined}
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditProduct(null); }}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      editProduct ? 'Update Product' : 'Add Product'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 