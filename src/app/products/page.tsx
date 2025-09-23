"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import PlanGuard from '@/components/PlanGuard';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { FaPlus, FaBox, FaExclamationTriangle, FaSearch, FaDownload, FaTrash, FaEdit, FaQrcode, FaUpload, FaLock, FaArrowUp, FaFilter, FaSortAmountDown, FaEllipsisV, FaPrint, FaTimes, FaChevronLeft, FaChevronRight, FaEye, FaEyeSlash, FaStore, FaChartLine, FaLayerGroup, FaMoneyBillWave, FaChevronDown } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { useBranch } from "@/contexts/BranchContext";

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
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId, canChangeBranch, isBranchLoading } = useBranch();
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
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'sku', 'price', 'stock']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const itemsPerPage = 20;
  
  const { limits, canCreate, getUsagePercentage } = usePlanLimits();

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');
  const canCreateProducts = hasPermission(user, 'create_products');
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');
 const canUploadProducts = hasPermission(user, 'bulk_upload');

  useEffect(() => {
    fetchProducts();
  }, [selectedBranchId]);

  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const data = await apiGet('/api/branches');
        setBranches(data);
        
        // If no branch is selected and user has a branch, use that
        if (data?.length > 0) {
          if (user?.branchId) {
            // If user has a specific branch, use that
            setSelectedBranchId(user.branchId);
          } else if (!selectedBranchId) {
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
  }, [user?.branchId]); // Add user.branchId as dependency

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
        } catch (err: any) {
          console.error('Error fetching products:', err);
          setError(err.message || "Failed to fetch products");
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

  async function fetchProducts() {
    if (!selectedBranchId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      // Fetch products for the selected branch using header
      const data = await apiGet(`/products`, { 'x-branch-id': selectedBranchId || '' });
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

    // Validate selectedBranchId before creating product
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
        stock: parseInt(formData.get("stock") as string),
        description: formData.get("description"),
        branchId: selectedBranchId, // Add branchId to payload
      }, { 'x-branch-id': selectedBranchId || '' });
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
        }, { 'x-branch-id': selectedBranchId || '' });
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
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/bulk-upload`);
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
    const token = localStorage.getItem("token");
    while (!finished) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/bulk-upload-progress/${uploadId}`,
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/clear-all`, {
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
  function flattenProduct(product: any) {
    return { ...product, ...(product.customFields || {}) };
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
  const allColumns = Array.from(allColumnsSet);

  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

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
          <p className="text-gray-600 mb-4">You don't have permission to view products.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage('products');
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FaBox className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <p className="text-gray-600">Manage your product catalog</p>
              </div>
            </div>
            
            {/* Branch Selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
              {branchesLoading ? (
                <div className="text-gray-500 text-sm">Loading branches...</div>
              ) : (
                <div className="flex items-center gap-3">
                  <select
                    value={selectedBranchId || ''}
                    onChange={e => handleBranchChange(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    style={{ minWidth: 200 }}
                    disabled={!canChangeBranch}
                  >
                    <option value="" disabled>Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FaStore className="w-4 h-4" />
                    <span>{branches.find(b => b.id === selectedBranchId)?.name || 'No branch selected'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <PlanGuard requiredPlan="Basic" fallback={
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600">Product management requires Basic plan or higher</p>
            </div>
          }>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                {viewMode === 'grid' ? (
                  <>
                    <FaSortAmountDown className="w-4 h-4" />
                    Table View
                  </>
                ) : (
                  <>
                    <FaLayerGroup className="w-4 h-4" />
                    Grid View
                  </>
                )}
              </button>
              {canCreateProducts ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={!canCreate('products')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    canCreate('products')
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FaPlus className="w-4 h-4" />
                  Add Product
                </button>
              ) : (
                <Tooltip content="You don't have permission to create products. Contact your administrator.">
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Product
                  </button>
                </Tooltip>
              )}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <FaBox className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Products</p>
                <p className="text-2xl font-bold text-blue-900">{products.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <FaMoneyBillWave className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Average Price</p>
                <p className="text-2xl font-bold text-green-900">
                  ${products.length ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <FaChartLine className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Stock</p>
                <p className="text-2xl font-bold text-purple-900">
                  {products.reduce((sum, p) => sum + p.stock, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-200 rounded-lg">
                <FaExclamationTriangle className="w-4 h-4 text-orange-700" />
              </div>
              <div>
                <p className="text-sm text-orange-700 font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-orange-900">
                  {products.filter(p => p.stock < 10).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Bulk Actions */}
        <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <div className="relative max-w-md">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or description..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
               
                <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">
                  <FaDownload className="w-4 h-4" />
                  Template
                </button>
              
                <form onSubmit={handleBulkUpload} className="flex items-center gap-2">
                  <input 
                    type="file" 
                    name="file" 
                    accept=".xlsx,.xls,.csv" 
                    className="text-xs border border-gray-300 rounded p-1"
                  />
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-100 border border-blue-200 hover:bg-blue-200 font-medium text-sm text-blue-700 transition disabled:opacity-50"
                  >
                    <FaUpload className="w-4 h-4" />
                    Bulk Upload
                  </button>
                </form>
              
              
               
                <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 font-medium text-sm text-red-700 transition">
                  <FaTrash className="w-4 h-4" />
                  Clear All
                </button>
              
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
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
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
          <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditProduct(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editProduct?.name || ''}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    defaultValue={editProduct?.sku || ''}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={editProduct?.price || ''}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    defaultValue={editProduct?.stock || ''}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editProduct?.description || ''}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Field value"
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </FeatureGuard>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      {editProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditProduct(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Display Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-gray-500">
              {selectedBranchId ? `Showing products for ${branches.find(b => b.id === selectedBranchId)?.name}` : 'Select a branch to view products'}
            </p>
          </div>
          
          {viewMode === 'table' && (
            <div className="relative">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <FaEye className="w-4 h-4" />
                Columns
                <FaChevronDown className="w-3 h-3" />
              </button>
              
              {showColumnSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-800">Visible Columns</h4>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {allColumns.map(column => (
                      <label key={column} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column)}
                          onChange={() => toggleColumnVisibility(column)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {column.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products Display */}
        {viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FaBox className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.stock > 10 ? 'bg-green-100 text-green-800' : 
                    product.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {product.stock} in stock
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold text-gray-800">${product.price.toFixed(2)}</span>
                  </div>
                  {product.description && (
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {canEditProducts ? (
                    <button 
                      onClick={() => openEditModal(product)} 
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 text-sm font-medium transition"
                    >
                      <FaEdit className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <Tooltip content="You don't have permission to edit products. Contact your administrator.">
                      <button 
                        disabled
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 text-sm font-medium cursor-not-allowed"
                      >
                        <FaEdit className="w-3 h-3" />
                        Edit
                      </button>
                    </Tooltip>
                  )}
                  
                  <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                    <button disabled className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-300 text-sm font-medium cursor-not-allowed">
                      <FaQrcode className="w-3 h-3" />
                      QR
                      <FaLock className="w-2 h-2" />
                    </button>
                  }>
                    <button 
                      onClick={() => setQrCodeProductId(product.id)} 
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 text-sm font-medium text-green-700 transition"
                    >
                      <FaQrcode className="w-3 h-3" />
                      QR
                    </button>
                  </FeatureGuard>
                  
                  {canDeleteProducts ? (
                    <button 
                      onClick={() => handleDelete(product.id)} 
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-sm font-medium text-red-700 transition"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  ) : (
                    <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                      <button 
                        disabled
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-300 text-sm font-medium cursor-not-allowed"
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                      <th 
                        key={col} 
                        className="px-4 py-3 font-semibold text-gray-600 text-left cursor-pointer hover:bg-gray-100 transition"
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
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
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
                          {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              {col === 'price' ? `$${flat[col]}` : flat[col] ?? '-'}
                            </td>
                          ))}
                          <td className="px-4 py-3">
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
                                <Tooltip content="You don't have permission to edit products. Contact your administrator.">
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
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
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
                      className={`w-10 h-10 text-sm rounded-lg transition ${
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
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                Next
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {products.length === 0 && !loading && !search && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first product.</p>
            {canCreateProducts && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Product
              </button>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {qrCodeProductId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeProductId(null)}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Product QR Code</h3>
                <button
                  onClick={() => setQrCodeProductId(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-center">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/${qrCodeProductId}/qr`}
                  alt="Product QR Code"
                  className="w-64 h-64 mx-auto mb-6 border border-gray-200 rounded-lg"
                />
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '', 'height=400,width=400');
                      if (printWindow) {
                        printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                        printWindow.document.write(`<img src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/products/${qrCodeProductId}/qr" />`);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaPrint className="w-4 h-4" />
                    Print
                  </button>
                  
                  <button
                    onClick={() => setQrCodeProductId(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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