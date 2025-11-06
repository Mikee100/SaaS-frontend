"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import PlanGuard from '@/components/PlanGuard';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { FaPlus, FaBox, FaExclamationTriangle, FaSearch, FaDownload, FaTrash, FaEdit, FaQrcode, FaUpload, FaLock, FaSortAmountDown, FaPrint, FaTimes, FaChevronLeft, FaChevronRight, FaStore, FaLayerGroup, FaChartBar, FaTags } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { useBranch } from "@/contexts/BranchContext";
import Image from 'next/image';
import API_BASE_URL from '../../config/apiConfig';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  customFields?: Record<string, string | number | boolean>;
  supplier?: {
    id: string;
    name: string;
  };
}

export default function ProductsPage() {
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ length: number } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 20;

  const { data: limits } = usePlanLimits();

  // Helper: can create product
  const canCreate = () => {
    if (!limits || !limits.usage?.products) return false;
    return limits.usage.products.current < limits.usage.products.limit;
  };

  // Helper: get usage percentage
  const getUsagePercentage = () => {
    if (!limits || !limits.usage?.products) return 0;
    return Math.round((limits.usage.products.current / limits.usage.products.limit) * 100);
  };

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');
  const canCreateProducts = hasPermission(user, 'create_products');
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');

  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const data = await apiGet<{ id: string; name: string }[]>('/branches');
        setBranches(data);

        // Only set initial branch if none is currently selected
        if (data?.length > 0 && !selectedBranchId) {
          if (user?.branchId) {
            // If user has a specific branch, use that
            setSelectedBranchId(user.branchId);
          } else {
            // Otherwise select the first branch
            setSelectedBranchId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setBranchesLoading(false);
      }
    }
    fetchBranches();
  }, [user?.branchId, setSelectedBranchId, selectedBranchId]);

  // Handle branch selection change
  const handleBranchChange = (branchId: string) => {
    if (!branchId) return;
    setSelectedBranchId(branchId);
    // The products will be fetched by the useEffect below
  };

  // Fetch products when selected branch changes
  useEffect(() => {
    if (selectedBranchId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          console.log('Fetching products for branch:', selectedBranchId);
          const data = await apiGet(`/products?branchId=${selectedBranchId}`);
          setProducts(Array.isArray(data) ? data : []);
          setError('');
        } catch (err: unknown) {
          const error = err as Error;
          setError(error.message || "Failed to fetch products");
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      // If no branch is selected, clear products
      setProducts([]);
      setLoading(false);
    }
  }, [selectedBranchId]);

  const fetchProducts = useCallback(async () => {
    if (!selectedBranchId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/products`, { 'x-branch-id': selectedBranchId || '' });
      setProducts(data as Product[]);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    if (!canCreate()) {
      alert('Product limit reached. Please upgrade your plan.');
      return;
    }

    if (!selectedBranchId || typeof selectedBranchId !== 'string' || selectedBranchId.trim() === '') {
      setError('Please select a valid branch before creating a product.');
      return;
    }

    setSaving(true);
    setError("");
    try {
      const newProduct = await apiPost("/products", {
        name: formData.get("name"),
        sku: formData.get("sku"),
        price: parseFloat(formData.get("price") as string),
        cost: parseFloat(formData.get("cost") as string) || 0,
        stock: parseInt(formData.get("stock") as string),
        description: formData.get("description"),
        supplier: formData.get("supplier"),
        branchId: selectedBranchId,
      }, { 'x-branch-id': selectedBranchId || '' }) as Product;
      setProducts([newProduct, ...products]);
      setShowAddForm(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to create/update product");
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
          cost: parseFloat(formData.get("cost") as string) || 0,
          stock: parseInt(formData.get("stock") as string),
          description: formData.get("description"),
          supplier: formData.get("supplier"),
        }, { 'x-branch-id': selectedBranchId || '' });
        setEditProduct(null);
      }
      setShowAddForm(false);
      resetForm();
      fetchProducts();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setEditProduct(null);
    setShowAddForm(false);
  };

  function openEditModal(product: Product) {
    setEditProduct(product);
    setShowAddForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiDelete(`/products/${id}`, { 'x-branch-id': selectedBranchId || '' });
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
        xhr.open("POST", `${API_BASE_URL}/products/bulk-upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
        xhr.setRequestHeader("x-branch-id", selectedBranchId || "");
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
              pollBackendProgress(data.uploadId);
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
    } catch (err: unknown) {
      const error = err as Error;
      setUploadError(error.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function pollBackendProgress(uploadId: string) {
    let finished = false;
    const token = localStorage.getItem("token");
    while (!finished) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/bulk-upload-progress/${uploadId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
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
      { name: "Sample Product", sku: "SKU001", price: 10.99, cost: 7.50, description: "Sample desc", stock: 100, customField1: "value" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product-upload-template.xlsx");
  }

  async function handleClearAll() {
    if (!confirm("Are you sure you want to delete ALL products? This cannot be undone.")) return;
    setClearMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/products/clear-all`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to clear products");
      const data = await res.json();
      setClearMsg(`Deleted ${data.deletedCount} products.`);
      fetchProducts();
    } catch (err: unknown) {
      const error = err as Error;
      setClearMsg(error.message || "Failed to clear products");
    }
  }

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    const aValue = a[sortField as keyof Product] || '';
    const bValue = b[sortField as keyof Product] || '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const filteredProducts = sortedProducts.filter(
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
  function flattenProduct(product: Product): { [key: string]: string | number | boolean | undefined; margin: string } {
   
    const { customFields, supplier, ...rest } = product;
    const flat: { [key: string]: string | number | boolean | undefined; margin: string } = { ...rest, ...(customFields || {}), margin: '' };

    // Add supplier name if exists
    if (supplier) {
      flat.supplier = supplier.name;
    }

    // Compute margin
    if (product.price > 0) {
      flat.margin = ((product.price - product.cost) / product.price * 100).toFixed(1);
    } else {
      flat.margin = 'N/A';
    }

    return flat;
  }

  // Dynamically determine all unique columns
  const allColumnsSet = new Set<string>();
  products.forEach((p) => {
    Object.keys(flattenProduct(p)).forEach((k) => {
      if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'customFields'].includes(k)) {
        allColumnsSet.add(k);
      }
    });
  });
  // Ensure margin is always available
  allColumnsSet.add('margin');
  const allColumns = Array.from(allColumnsSet);

  // By default, show all columns
  const visibleColumns = allColumns;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view products
  if (!canViewProducts) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view products.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();
  const isNearLimit = usagePercentage >= 80;

  return (
    <AuthGuard>
      <div className="max-w-screen-2xl mx-auto px-1 sm:px-2 lg:px-3 py-2">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaBox className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Products</h1>
                <p className="text-xs text-gray-600">Manage your product catalog</p>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Select Branch</label>
              {branchesLoading ? (
                <div className="text-gray-400 text-xs">Loading branches...</div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBranchId || ''}
                    onChange={e => handleBranchChange(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-xs"
                    style={{ minWidth: 120 }}
                    disabled={false}
                  >
                    <option value="" disabled>Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FaStore className="w-3 h-3" />
                    <span>{branches.find(b => b.id === selectedBranchId)?.name || 'No branch selected'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <PlanGuard requiredPlan="Basic" fallback={
            <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-600">Product management requires Basic plan or higher</p>
            </div>
          }>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/products/categories"
                className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
              >
                <FaTags className="w-3 h-3" />
                Categories
              </Link>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="px-2 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1 text-xs"
              >
                {viewMode === 'grid' ? (
                  <>
                    <FaSortAmountDown className="w-3 h-3" />
                    Table
                  </>
                ) : (
                  <>
                    <FaLayerGroup className="w-3 h-3" />
                    Grid
                  </>
                )}
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs">
                <FaPrint className="w-3 h-3" />
                Print
              </button>
              {canCreateProducts ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={!canCreate()}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded font-medium text-xs ${
                    canCreate()
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FaPlus className="w-3 h-3" />
                  Add
                </button>
              ) : (
                <Tooltip content="You don't have permission to create products. Contact your administrator.">
                  <button
                    disabled
                    className="flex items-center gap-1 px-2 py-1.5 rounded font-medium bg-gray-300 text-gray-500 cursor-not-allowed text-xs"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add
                  </button>
                </Tooltip>
              )}
            </div>
          </PlanGuard>
        </div>

        {/* Usage Warning */}
        {isNearLimit && (
          <div className="mb-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-amber-600 w-4 h-4" />
              <div>
                <h4 className="font-medium text-amber-800 text-xs">Approaching Product Limit</h4>
                <p className="text-xs text-amber-700">
                  You&apos;ve used {limits?.usage.products.current} of {limits?.usage.products.limit} products.
                  Consider upgrading to add more products.
                </p>
              </div>
            </div>
            <div className="mt-1">
              <a
                href="/settings/billing"
                className="inline-flex items-center px-2 py-0.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        )}

        {/* Navigation to Analytics */}
        <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-blue-800">Product Management</h2>
            <div className="flex gap-2">
              <Link
                href="/products/analytics"
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              >
                <FaChartBar className="w-3 h-3" />
                Analytics
              </Link>
              <Link
                href="/products/variations"
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
              >
                <FaLayerGroup className="w-3 h-3" />
                Variations
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Bulk Actions */}
        <div className="mb-3 p-2 bg-white rounded border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Search Products</label>
              <div className="relative max-w-xs">
                <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or description..."
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={downloadTemplate} className="flex items-center gap-1 px-2 py-1.5 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-xs">
                <FaDownload className="w-3 h-3" />
                Template
              </button>
              <form onSubmit={handleBulkUpload} className="flex items-center gap-1">
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls,.csv"
                  className="text-xs border border-gray-300 rounded p-0.5"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-blue-100 border border-blue-200 hover:bg-blue-200 font-medium text-xs text-blue-700 transition disabled:opacity-50"
                >
                  <FaUpload className="w-3 h-3" />
                  Bulk
                </button>
              </form>
              <button onClick={handleClearAll} className="flex items-center gap-1 px-2 py-1.5 rounded bg-red-50 border border-red-200 hover:bg-red-100 font-medium text-xs text-red-700">
                <FaTrash className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">Upload completed: {uploadResult.length} products processed</p>
            </div>
          )}

          {uploadError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}

          {clearMsg && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">{clearMsg}</p>
            </div>
          )}
        </div>

        {/* Add/Edit Product Form */}
        {showAddForm && (
          <div className="mb-4 p-3 bg-white rounded shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-800">
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editProduct?.name || ''}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    defaultValue={editProduct?.sku || ''}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Price *</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={editProduct?.price || ''}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Cost</label>
                  <input
                    type="number"
                    name="cost"
                    step="0.01"
                    min="0"
                    defaultValue={editProduct?.cost || ''}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    defaultValue={editProduct?.stock || ''}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                <textarea
                  name="description"
                  defaultValue={editProduct?.description || ''}
                  rows={3}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs flex items-center gap-1"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      {editProduct ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
                >
                  Cancel
                </button>
              </div>
              </div>
            </form>
          </div>
        )}

        {/* Products Display Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-gray-500">
              {selectedBranchId ? `Showing products for ${branches.find(b => b.id === selectedBranchId)?.name}` : 'Select a branch to view products'}
            </p>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentProducts.map((product) => (
              <div key={product.id} className="bg-white rounded border border-gray-200 p-3 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <FaBox className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.stock > 10 ? 'bg-green-100 text-green-800' :
                    product.stock > 0 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {product.stock} in stock
                  </div>
                </div>
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold text-gray-800">${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-semibold text-gray-800">${product.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Margin:</span>
                    <span className={`font-semibold ${product.price > 0 ? (product.price - product.cost) / product.price * 100 >= 20 ? 'text-green-600' : 'text-amber-600' : 'text-gray-800'}`}>
                      {product.price > 0 ? `${((product.price - product.cost) / product.price * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  {product.supplier && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Supplier:</span>
                      <span className="font-semibold text-gray-800">{product.supplier.name}</span>
                    </div>
                  )}
                  {product.description && (
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {product.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 pt-2 border-t border-gray-100">
                  {canEditProducts ? (
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 text-xs font-medium transition"
                    >
                      <FaEdit className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <Tooltip content="You don&apos;t have permission to edit products. Contact your administrator.">
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-100 border border-gray-200 text-gray-400 text-xs font-medium cursor-not-allowed"
                      >
                        <FaEdit className="w-3 h-3" />
                        Edit
                      </button>
                    </Tooltip>
                  )}

                  <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                    <button disabled className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-300 text-xs font-medium cursor-not-allowed">
                      <FaQrcode className="w-3 h-3" />
                      QR
                      <FaLock className="w-2 h-2" />
                    </button>
                  }>
                    <button
                      onClick={() => setQrCodeProductId(product.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 hover:bg-green-100 text-xs font-medium text-green-700 transition"
                    >
                      <FaQrcode className="w-3 h-3" />
                      QR
                    </button>
                  </FeatureGuard>

                  {canDeleteProducts ? (
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-medium text-red-700 transition"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  ) : (
                    <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                      <button
                        disabled
                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 text-red-300 text-xs font-medium cursor-not-allowed"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
        // Table View
        <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                    <th 
                      key={col} 
                      className="px-2 py-2 font-semibold text-gray-600 text-left cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                        {sortField === col && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-400">
                      <div className="flex flex-col items-center justify-center py-8">
                        <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No products found.</p>
                        {search && (
                          <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product) => {
                    const flat = flattenProduct(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        {allColumns.filter(col => visibleColumns.includes(col)).map(col => {
                          let displayValue: string | number | boolean | undefined = flat[col] ?? '-';
                          let className = '';
                          if (col === 'price' || col === 'cost') {
                            displayValue = `$${typeof flat[col] === 'number' ? flat[col].toFixed(2) : flat[col]}`;
                          } else if (col === 'margin') {
                            const marginValue = typeof flat[col] === 'string' && flat[col] !== 'N/A' ? parseFloat(flat[col]) : 0;
                            className = marginValue >= 20 ? 'text-green-600 font-semibold' : marginValue >= 0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
                            displayValue = flat[col] === 'N/A' ? 'N/A' : `${flat[col]}%`;
                          }
                          return (
                            <td key={col} className={`px-2 py-2 whitespace-nowrap ${className}`}>
                              {displayValue}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-2">
                            {canEditProducts ? (
                              <button 
                                onClick={() => openEditModal(product)} 
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>
                            ) : (
                              <Tooltip content="You don&apos;t have permission to edit products. Contact your administrator.">
                                <button 
                                  disabled
                                  className="p-2 text-gray-400 rounded-lg cursor-not-allowed"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            
                            <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                              <button disabled className="p-2 text-gray-400 rounded-lg cursor-not-allowed" title="QR Code (Upgrade required)">
                                <FaQrcode className="w-4 h-4" />
                              </button>
                            }>
                              <button 
                                onClick={() => setQrCodeProductId(product.id)} 
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="QR Code"
                              >
                                <FaQrcode className="w-4 h-4" />
                              </button>
                            </FeatureGuard>
                            
                            {canDeleteProducts ? (
                              <button 
                                onClick={() => handleDelete(product.id)} 
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            ) : (
                              <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                                <button 
                                  disabled
                                  className="p-2 text-gray-400 rounded-lg cursor-not-allowed"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
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
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <FaChevronLeft className="w-3 h-3" />
                Previous
              </button>
              
              <div className="flex gap-1">
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
                      className={`w-10 h-10 text-xs rounded-lg transition ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {totalPages > 5 && (
                  <span className="px-2 py-2 text-gray-500">...</span>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                Next
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && !loading && !search && (
          <div className="text-center py-8 bg-white rounded border border-gray-200">
            <FaBox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No products yet</h3>
            <p className="text-xs text-gray-500 mb-2">Get started by adding your first product.</p>
            {canCreateProducts && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              >
                Add Your First Product
              </button>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {qrCodeProductId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2" onClick={() => setQrCodeProductId(null)}>
            <div className="bg-white rounded shadow-xl p-3 max-w-xs w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-900">Product QR Code</h3>
                <button
                  onClick={() => setQrCodeProductId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <Image
                  src={`${API_BASE_URL}/products/${qrCodeProductId}/qr`}
                  alt="Product QR Code"
                  width={192}
                  height={192}
                  className="w-48 h-48 mx-auto mb-4 border border-gray-200 rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '', 'height=400,width=400');
                      if (printWindow) {
                        printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                        printWindow.document.write(`<img src="${API_BASE_URL}/products/${qrCodeProductId}/qr" />`);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    <FaPrint className="w-3 h-3" />
                    Print
                  </button>
                  <button
                    onClick={() => setQrCodeProductId(null)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}