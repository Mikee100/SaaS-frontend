"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import PlanGuard from '@/components/PlanGuard';
import FeatureGuard from '@/components/FeatureGuard';
import { FaPlus, FaBox, FaExclamationTriangle, FaSearch, FaDownload, FaTrash, FaEdit, FaQrcode, FaUpload, FaLock, FaArrowUp } from 'react-icons/fa';
import * as XLSX from 'xlsx';


interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
  customFields?: Record<string, any>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const itemsPerPage = 20;
  
  const { limits, canCreate, getUsagePercentage } = usePlanLimits();

  useEffect(() => {
    fetchProducts();
  }, []);



  async function fetchProducts() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/products");
      setProducts(data as Product[]);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    if (!canCreate('products')) {
      alert('Product limit reached. Please upgrade your plan.');
      return;
    }

    setSaving(true);
    setError("");
    try {
      const newProduct = await apiPost("/products", {
        name: formData.get("name"),
        sku: formData.get("sku"),
        price: parseFloat(formData.get("price") as string),
        stock: parseInt(formData.get("stock") as string),
        description: formData.get("description"),
      });
      
      setProducts([newProduct, ...products]);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      if (editProduct) {
        await apiPut(`/products/${editProduct.id}`, {
          name: formData.get("name"),
          sku: formData.get("sku"),
          price: parseFloat(formData.get("price") as string),
          stock: parseInt(formData.get("stock") as string),
          description: formData.get("description"),
        });
        setEditProduct(null);
      }
      setShowAddForm(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(product: Product) {
    setEditProduct(product);
    setShowAddForm(true);
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

  const filteredProducts = products.filter(
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
  products.forEach((p) => {
    Object.keys(flattenProduct(p)).forEach((k) => {
      if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'customFields'].includes(k)) {
        allColumnsSet.add(k);
      }
    });
  });
  const allColumns = Array.from(allColumnsSet);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage('products');
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        
        <PlanGuard requiredPlan="Basic" fallback={
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Product management requires Basic plan or higher</p>
          </div>
        }>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'grid' ? 'Table View' : 'Grid View'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={!canCreate('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canCreate('products')
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaPlus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </PlanGuard>
      </div>

      {/* Usage Warning */}
      {isNearLimit && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-amber-600 w-5 h-5" />
            <div>
              <h4 className="font-medium text-amber-800">Approaching Product Limit</h4>
              <p className="text-sm text-amber-700">
                You've used {limits?.usage.products.current} of {limits?.usage.products.limit} products. 
                Consider upgrading to add more products.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <a
              href="/settings/billing"
              className="inline-flex items-center px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors"
            >
              Upgrade Plan
            </a>
          </div>
        </div>
      )}

      {/* Search and Bulk Actions */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs text-gray-500 mb-1">Search Products</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                style={{ minWidth: 220 }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <FeatureGuard requiredFeature="data_export" showUpgradePrompt={false} fallback={
              <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed">
                <FaDownload className="w-4 h-4" />
                Download Template
                <FaLock className="w-3 h-3" />
              </button>
            }>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">
                <FaDownload className="w-4 h-4" />
                Download Template
              </button>
            </FeatureGuard>
            
            <FeatureGuard requiredFeature="bulk_operations" showUpgradePrompt={false} fallback={
              <div className="inline-block">
                <input type="file" name="file" accept=".xlsx,.xls,.csv" className="text-xs" disabled />
                <button disabled className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed">
                  <FaUpload className="w-4 h-4" />
                  Bulk Upload
                  <FaLock className="w-3 h-3" />
                </button>
              </div>
            }>
              <form onSubmit={handleBulkUpload} className="inline-block">
                <input type="file" name="file" accept=".xlsx,.xls,.csv" className="text-xs" />
                <button type="submit" className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">
                  <FaUpload className="w-4 h-4" />
                  Bulk Upload
                </button>
              </form>
            </FeatureGuard>
            
            <FeatureGuard requiredFeature="bulk_operations" showUpgradePrompt={false} fallback={
              <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-300 font-medium text-sm cursor-not-allowed">
                <FaTrash className="w-4 h-4" />
                Clear All
                <FaLock className="w-3 h-3" />
              </button>
            }>
              <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 font-medium text-sm text-red-700 transition">
                <FaTrash className="w-4 h-4" />
                Clear All
              </button>
            </FeatureGuard>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">Upload completed: {uploadResult.length} products processed</p>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        )}

        {clearMsg && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{clearMsg}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editProduct?.name || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  name="sku"
                  defaultValue={editProduct?.sku || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  defaultValue={editProduct?.price || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  name="stock"
                  defaultValue={editProduct?.stock || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                defaultValue={editProduct?.description || ''}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Custom Fields Section - Only for Pro+ */}
            <FeatureGuard requiredFeature="custom_fields" fallback={
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FaLock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Custom Fields</span>
                </div>
                <p className="text-xs text-gray-500">
                  Add custom fields to your products with Pro plan or higher.
                </p>
              </div>
            }>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Field name (e.g., Brand, Category)"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Field value"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </FeatureGuard>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (editProduct ? 'Update Product' : 'Create Product')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditProduct(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Display */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <FaBox className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-gray-800">${product.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock:</span>
                  <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.stock}
                  </span>
                </div>
              </div>
              
              {product.description && (
                <p className="text-sm text-gray-600 mt-3">{product.description}</p>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => openEditModal(product)} 
                  className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 text-xs font-medium transition"
                >
                  <FaEdit className="w-3 h-3" />
                  Edit
                </button>
                <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                  <button disabled className="flex items-center gap-1 px-3 py-1 rounded bg-green-50 border border-green-200 text-green-300 text-xs font-medium cursor-not-allowed">
                    <FaQrcode className="w-3 h-3" />
                    QR
                    <FaLock className="w-2 h-2" />
                  </button>
                }>
                  <button 
                    onClick={() => setQrCodeProductId(product.id)} 
                    className="flex items-center gap-1 px-3 py-1 rounded bg-green-50 border border-green-200 hover:bg-green-100 text-xs font-medium text-green-700 transition"
                  >
                    <FaQrcode className="w-3 h-3" />
                    QR
                  </button>
                </FeatureGuard>
                <button 
                  onClick={() => handleDelete(product.id)} 
                  className="flex items-center gap-1 px-3 py-1 rounded bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-medium text-red-700 transition"
                >
                  <FaTrash className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table View
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  {allColumns.map(col => (
                    <th key={col} className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-100">
                      {col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={allColumns.length + 1} className="text-center py-8 text-gray-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product) => {
                    const flat = flattenProduct(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        {allColumns.map(col => (
                          <td key={col} className="px-4 py-3 border-b border-gray-50 whitespace-nowrap">
                            {flat[col] ?? '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 border-b border-gray-50">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openEditModal(product)} 
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                              <button disabled className="text-xs font-medium text-gray-400 cursor-not-allowed">
                                QR
                                <FaLock className="w-2 h-2 inline ml-1" />
                              </button>
                            }>
                              <button 
                                onClick={() => setQrCodeProductId(product.id)} 
                                className="text-xs font-medium text-green-600 hover:underline"
                              >
                                QR
                              </button>
                            </FeatureGuard>
                            <button 
                              onClick={() => handleDelete(product.id)} 
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <FaBox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
          <p className="text-gray-500">Get started by adding your first product.</p>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeProductId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Product QR Code</h3>
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}/products/${qrCodeProductId}/qr`}
              alt="Product QR Code"
              className="w-64 h-64 mx-auto"
            />
            <button
              onClick={() => {
                const printWindow = window.open('', '', 'height=400,width=400');
                if (printWindow) {
                  printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                  printWindow.document.write(`<img src="${process.env.NEXT_PUBLIC_API_URL}/products/${qrCodeProductId}/qr" />`);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }
              }}
              className="w-full mt-6 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 