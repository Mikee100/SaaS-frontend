"use client";
import { useEffect, useState, useCallback /*, useRef*/ } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import { FaBox, FaExclamationTriangle, FaSearch, FaTrash, FaEdit, FaQrcode, FaLock, FaSortAmountDown, FaPrint, FaTimes, FaChevronRight, FaLayerGroup, FaChartBar } from 'react-icons/fa';
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadMoreError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('productsItemsPerPage') || '20', 10));
  const [showUsageBanner, setShowUsageBanner] = useState(true);

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

  // Load more products function
  const loadMoreProducts = useCallback(async () => {
    if (!selectedBranchId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = Math.floor(products.length / itemsPerPage) + 1;
      console.log('Loading more products for branch:', selectedBranchId, 'page:', nextPage, 'search:', debouncedSearch);

      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await apiGet(`/products?page=${nextPage}&limit=${itemsPerPage}&branchId=${selectedBranchId}${searchParam}`) as { products: Product[]; pagination: unknown };

      if (data.products && data.products.length > 0) {
        setProducts(prev => [...prev, ...data.products]);
        setHasMore(data.products.length === itemsPerPage);
      } else {
        setHasMore(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to load more products");
    } finally {
      setLoadingMore(false);
    }
  }, [selectedBranchId, loadingMore, hasMore, products.length, itemsPerPage, debouncedSearch]);

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    localStorage.setItem('productsItemsPerPage', newItemsPerPage.toString());
    // Reset products and fetch initial data with new limit
    setProducts([]);
    setHasMore(true);
    setCurrentPage(1);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [search]);

  // Initial load when branch or debounced search changes
  useEffect(() => {
    if (selectedBranchId) {
      const fetchInitialData = async () => {
        try {
          setLoading(true);
          setProducts([]);
          setHasMore(true);
          setCurrentPage(1);
          console.log('Fetching initial products for branch:', selectedBranchId, 'search:', debouncedSearch);

          const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
          const data = await apiGet(`/products?page=1&limit=${itemsPerPage}&branchId=${selectedBranchId}${searchParam}`) as { products: Product[]; pagination: unknown };
          setProducts(data.products || []);
          setHasMore(data.products && data.products.length === itemsPerPage);
          setError('');
        } catch (err: unknown) {
          const error = err as Error;
          setError(error.message || "Failed to fetch products");
          setProducts([]);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      };

      fetchInitialData();
    } else {
      // If no branch is selected, clear products
      setProducts([]);
      setLoading(false);
      setHasMore(false);
    }
  }, [selectedBranchId, itemsPerPage, debouncedSearch]);

  const fetchProducts = useCallback(async () => {
    if (!selectedBranchId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/products?page=${currentPage}&limit=${itemsPerPage}`, { 'x-branch-id': selectedBranchId || '' }) as { products: Product[]; pagination: unknown };
      // API now returns { products: Product[], pagination: {...} }

      setProducts(data.products || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, currentPage, itemsPerPage]);

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

  // Display all loaded products (infinite scroll style)
  const currentProducts = sortedProducts;

  // Show loading indicator when search is being debounced
  const isSearching = search !== debouncedSearch;

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
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 py-2">
        {/* Usage Warning Banner (auto-dismiss) */}
        {isNearLimit && showUsageBanner && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded shadow">
              <FaExclamationTriangle className="text-amber-600 w-4 h-4" />
              <div className="flex-1">
                <span className="font-medium text-amber-800 text-xs">Approaching Product Limit:</span>
                <span className="text-xs text-amber-700 ml-1">
                  {limits?.usage.products.current} of {limits?.usage.products.limit} used.
                </span>
              </div>
              <a
                href="/settings/billing"
                className="px-2 py-0.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
              >
                Upgrade
              </a>
              <button
                onClick={() => setShowUsageBanner(false)}
                className="ml-1 p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100"
                title="Dismiss"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Header: Title, Branch, Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaBox className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">Products</h1>
              <p className="text-xs text-gray-600 truncate">Manage your product catalog</p>
            </div>
            {/* Branch Selector */}
            <div className="ml-4 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-700">Branch:</label>
              {branchesLoading ? (
                <span className="text-gray-400 text-xs">Loading...</span>
              ) : (
                <select
                  value={selectedBranchId || ''}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded bg-white text-xs"
                  style={{ minWidth: 100 }}
                >
                  <option value="" disabled>Select</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {/* Actions: View, Print, Add, Analytics, Variations */}
          <div className="flex flex-wrap gap-1 items-center">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1 text-xs"
              title={viewMode === 'grid' ? 'Switch to Table' : 'Switch to Grid'}
            >
              {viewMode === 'grid' ? <FaSortAmountDown className="w-3 h-3" /> : <FaLayerGroup className="w-3 h-3" />}
              {viewMode === 'grid' ? 'Table' : 'Grid'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs">
              <FaPrint className="w-3 h-3" />
            </button>
            <Link
              href="/products/analytics"
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            >
              <FaChartBar className="w-3 h-3" />
            </Link>
            <Link
              href="/products/variations"
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            >
              <FaLayerGroup className="w-3 h-3" />
            </Link>
           
          </div>
        </div>

        {/* Product Count, Search, Items Per Page, Bulk Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-800">
              {loading || isSearching ? 'Loading...' : `${products.length} Product${products.length !== 1 ? 's' : ''}`}
            </h3>
            <span className="text-xs text-gray-500">
              {selectedBranchId ? `(${branches.find(b => b.id === selectedBranchId)?.name || ''})` : ''}
              {hasMore && !loading && !isSearching && <span className="text-blue-600 ml-1">• More available</span>}
            </span>
            <label className="text-xs font-medium text-gray-700 ml-4">Items:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
              className="px-2 py-1 border border-gray-300 rounded bg-white text-xs"
              disabled={loading || isSearching}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs">
              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, SKU, desc..."
                className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                style={{ minWidth: 180 }}
              />
              {isSearching && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            {/* Bulk Actions */}
           
          </div>
        </div>

        {/* Upload Progress/Results/ClearMsg */}
        {(loadMoreError) && (
          <div className="mb-2">
            {loadMoreError && (
              <div className="mb-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                {loadMoreError}
              </div>
            )}
          </div>
        )}

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


        {/* Products Content */}
        {loading || isSearching ? (
          // Loading skeleton for products section
          <div className="bg-white rounded border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="bg-gray-50 rounded border border-gray-200 p-3 animate-pulse">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-gray-200 rounded w-8 h-8"></div>
                        <div className="space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </div>
                    <div className="space-y-2 mb-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Price:</span>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Cost:</span>
                        <div className="h-4 bg-gray-200 rounded w-10"></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Margin:</span>
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
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
                        <span className="font-semibold text-gray-800">${(product.cost || 0).toFixed(2)}</span>
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
          </>
          
        )}

        {/* Load More Section */}
        {hasMore && !loading && !isSearching && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMoreProducts}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minWidth: 200 }}
            >
              {loadingMore ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Loading Products...
                </>
              ) : (
                <>
                  Load More Products
                  <FaChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading Skeleton for Load More */}
        {loadingMore && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white rounded border border-gray-200 p-3 shadow-sm animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gray-200 rounded w-8 h-8"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="space-y-2 mb-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Price:</span>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Cost:</span>
                    <div className="h-4 bg-gray-200 rounded w-10"></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Margin:</span>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
                <div className="flex gap-1 pt-2 border-t border-gray-100">
                  <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasMore && products.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">
                All products loaded ({products.length} total)
              </span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && !loading && !isSearching && (
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