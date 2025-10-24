"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete, apiPut } from "@/utils/api";

import PlanGuard from '@/components/PlanGuard';
import { FaEdit, FaTrash, FaPlus, FaPrint, FaChartPie, FaList } from 'react-icons/fa';

// Dummy hasPermission implementation, replace with your actual logic or import
function hasPermission(user: unknown, permission: string): boolean {
  // Example: check if user.permissions includes the permission string
  return !!(user as { permissions?: string[] })?.permissions?.includes(permission);
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  customFields?: Record<string, string | number | boolean>;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  variationsCount?: number;
  totalStock?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  products: Product[];
  _count?: {
    products: number;
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [search, setSearch] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of products per page

  // Permission checks
  const canCreateProducts = hasPermission(user, 'create_products');
  const canEditProducts = hasPermission(user, 'edit_products');
  const canDeleteProducts = hasPermission(user, 'delete_products');

  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const data = await apiGet<{ id: string; name: string }[]>('/api/branches');
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

  // Fetch product classes and categories when selected branch changes
  useEffect(() => {
    if (selectedBranchId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          console.log('Fetching product classes and categories for branch:', selectedBranchId);

          // Fetch categories with their products
          console.log('Fetching categories from API...');
          const categoriesData = await apiGet(`/products/categories`, { 'x-branch-id': selectedBranchId || '' }) as unknown;
          console.log('Categories data received:', categoriesData);
          console.log('Categories data length:', Array.isArray(categoriesData) ? categoriesData.length : 'not array');
          if (Array.isArray(categoriesData)) {
            categoriesData.forEach((cat, index) => {
              console.log(`Category ${index}: ${cat.name}, products count: ${cat.products?.length || 0}`);
            });
          }
          const categoriesWithProducts = await Promise.all(
            (Array.isArray(categoriesData) ? categoriesData : []).map(async (category: Category) => {
              // For each category, enrich products with variations data
              const productsWithVariations = await Promise.all(
                (category.products || []).map(async (product: Product) => {
                  try {
                    const variations = await apiGet(`/products/${product.id}/variations`, { 'x-branch-id': selectedBranchId || '' });
                    const variationsArray = Array.isArray(variations) ? variations : [];
                    const totalStock = variationsArray.reduce((sum, v: unknown) => {
                      const variation = v as { stock?: number };
                      return sum + (variation.stock || 0);
                    }, 0);
                    const prices = variationsArray.map((v: unknown) => (v as { price?: number }).price || product.price).filter(p => p > 0);
                    const priceRange = prices.length > 0 ? {
                      min: Math.min(...prices),
                      max: Math.max(...prices)
                    } : undefined;

                    return {
                      ...product,
                      variationsCount: variationsArray.length,
                      totalStock,
                      priceRange,
                      variations: variationsArray
                    };
                  } catch {
                    return {
                      ...product,
                      variationsCount: 0,
                      totalStock: product.stock,
                      priceRange: undefined,
                      variations: []
                    };
                  }
                })
              );

              return {
                ...category,
                products: productsWithVariations
              };
            })
          );

          console.log('Final categories with products:', categoriesWithProducts);
          setCategories(categoriesWithProducts);

          // Also fetch uncategorized products
          console.log('Fetching all products for uncategorized...');
          const allProducts = await apiGet(`/products?branchId=${selectedBranchId}`);
          console.log('All products received:', allProducts);
          const uncategorizedProducts = await Promise.all(
            (Array.isArray(allProducts) ? allProducts : [])
              .filter((product: Product) => !product.categoryId)
              .map(async (productClass: Product) => {
                try {
                  const variations = await apiGet(`/products/${productClass.id}/variations`, { 'x-branch-id': selectedBranchId || '' });
                  const variationsArray = Array.isArray(variations) ? variations : [];
                  const totalStock = variationsArray.reduce((sum, v: unknown) => {
                    const variation = v as { stock?: number };
                    return sum + (variation.stock || 0);
                  }, 0);
                  const prices = variationsArray.map((v: unknown) => (v as { price?: number }).price || productClass.price).filter(p => p > 0);
                  const priceRange = prices.length > 0 ? {
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                  } : undefined;

                  return {
                    ...productClass,
                    variationsCount: variationsArray.length,
                    totalStock,
                    priceRange,
                    variations: variationsArray
                  };
                } catch {
                  return {
                    ...productClass,
                    variationsCount: 0,
                    totalStock: productClass.stock,
                    priceRange: undefined,
                    variations: []
                  };
                }
              })
          );

          // Add uncategorized products as a special category
          console.log('Uncategorized products:', uncategorizedProducts);
          if (uncategorizedProducts.length > 0) {
            categoriesWithProducts.push({
              id: 'uncategorized',
              name: 'Uncategorized',
              description: 'Products without a category',
              products: uncategorizedProducts,
              _count: { products: uncategorizedProducts.length }
            });
          }

          console.log('Final categories including uncategorized:', categoriesWithProducts);
          setCategories(categoriesWithProducts);
          
        } catch {
    
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      // If no branch is selected, clear data
      setCategories([]);
      setLoading(false);
    }
  }, [selectedBranchId]);

  const fetchProductClasses = useCallback(async () => {
    if (!selectedBranchId) {
     
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet(`/products`, { 'x-branch-id': selectedBranchId || '' });
      // Removed: const classesWithVariations = await Promise.all(
      await Promise.all(
        (Array.isArray(data) ? data : []).map(async (productClass: Product) => {
          try {
            const variations = await apiGet(`/products/${productClass.id}/variations`, { 'x-branch-id': selectedBranchId || '' });
            const variationsArray = Array.isArray(variations) ? variations : [];
            const totalStock = variationsArray.reduce((sum, v: unknown) => sum + ((v as { stock?: number }).stock || 0), 0);
            const prices = variationsArray.map((v: unknown) => (v as { price?: number }).price || productClass.price).filter(p => p > 0);
            const priceRange = prices.length > 0 ? {
              min: Math.min(...prices),
              max: Math.max(...prices)
            } : undefined;

            return {
              ...productClass,
              variationsCount: variationsArray.length,
              totalStock,
              priceRange
            };
          } catch {
            return {
              ...productClass,
              variationsCount: 0,
              totalStock: productClass.stock,
              priceRange: undefined
            };
          }
        })
      );
    } catch {
      // Removed: const error = err as Error;
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchProductClasses();
  }, [fetchProductClasses]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this product class?")) return;
    await apiDelete(`/products/${id}`, { 'x-branch-id': selectedBranchId || '' });
    fetchProductClasses();
  }

  const handleCategorySave = async () => {
    if (!categoryForm.name) {
      alert("Category name is required");
      return;
    }
    setLoading(true);
    try {
      let savedCategory: unknown;
      if (editingCategory) {
        // Update existing category
        savedCategory = await apiPut(`/products/categories/${editingCategory.id}`, {
          name: categoryForm.name,
          description: categoryForm.description
        }, { 'x-branch-id': selectedBranchId || '' });
        setCategories((prev: Category[]) =>
          prev.map((cat: Category): Category =>
            cat.id === (savedCategory as Category).id
              ? (savedCategory as Category)
              : cat
          )
        );
      } else {
        // Create new category
        savedCategory = await apiPost(`/products/categories`, {
          name: categoryForm.name,
          description: categoryForm.description
        }, { 'x-branch-id': selectedBranchId || '' });
        setCategories(prev => [...prev, savedCategory as Category]);
      }
      setShowCategoryModal(false);
    } catch  {
      // Removed: const error = err as Error;
    } finally {
      setLoading(false);
    }
  };

  // Search products by name or SKU
  const filteredProducts = (categories: Category[]) => {
    if (!search) return categories;
    const lowercasedSearch = search.toLowerCase();
    return categories.map(category => ({
      ...category,
      products: category.products.filter(product =>
        product.name.toLowerCase().includes(lowercasedSearch) ||
        product.sku.toLowerCase().includes(lowercasedSearch)
      )
    })).filter(category => category.products.length > 0);
  };

  const paginatedProducts = (categories: Category[]) => {
    const filtered = filteredProducts(categories);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.map(category => ({
      ...category,
      products: category.products.slice(start, end)
    }));
  };

  const totalPages = Math.ceil(filteredProducts(categories).length / itemsPerPage);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (printContent) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Print Products</title>
              <style>
                /* Add your custom styles for printing here */
                body { font-family: Arial, sans-serif; }
                h1 { font-size: 24px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; }
                th { background-color: #f4f4f4; }
              </style>
            </head>
            <body>
              <h1>Products Report</h1>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        win.document.close();
        win.print();
      }
    }
  };

  // Remove unused parameter 'event' from handleCategoryModalClose
  function handleCategoryModalClose(): void {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
  }

  return (
    <PlanGuard>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <div>
            <button
              onClick={handlePrint}
              className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600 transition-all flex items-center"
            >
              <FaPrint className="mr-2" />
              Print
            </button>
            {canCreateProducts && (
              <button
                onClick={() => router.push('/products/new')}
                className="bg-green-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-600 transition-all flex items-center ml-2"
              >
                <FaPlus className="mr-2" />
                New Product
              </button>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Branch
          </label>
          <div className="relative">
            <select
              value={selectedBranchId ?? ""}
              onChange={e => handleBranchChange(e.target.value)}
              className="block w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none py-2 px-3"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {branchesLoading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="animate-spin h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4.93 4.93a10 10 0 0114.14 0M1 12h2m16 0h2m-2.93 7.07a10 10 0 010-14.14M21 12h2"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="flex mb-4">
          <div className="flex-1 mr-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name or SKU"
              className="block w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none py-2 px-3"
            />
          </div>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-all mr-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaChartPie className="mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaList className="mr-2" />
            List View
          </button>
        </div>
        {activeTab === 'list' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {paginatedProducts(categories).map(category => (
                <div key={category.id} className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="text-lg font-semibold mb-2">{category.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{category.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.products.map(product => (
                      <div key={product.id} className="bg-gray-50 rounded-lg p-3 shadow-sm flex flex-col">
                        <div className="flex-1">
                          <h3 className="text-md font-medium">{product.name}</h3>
                          <p className="text-sm text-gray-500">{product.sku}</p>
                          <p className="text-sm font-semibold mt-1">
                            Price: ${product.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Stock: {product.stock} {product.variationsCount && `(${product.variationsCount} variants)`}
                          </p>
                        </div>
                        <div className="flex mt-2">
                          {canEditProducts && (
                            <button
                              onClick={() => router.push(`/products/${product.id}/edit`)}
                              className="flex-1 bg-yellow-500 text-white rounded-md px-3 py-2 text-sm font-medium shadow-md hover:bg-yellow-600 transition-all mr-2"
                            >
                              <FaEdit className="mr-1" />
                              Edit
                            </button>
                          )}
                          {canDeleteProducts && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="flex-1 bg-red-500 text-white rounded-md px-3 py-2 text-sm font-medium shadow-md hover:bg-red-600 transition-all"
                            >
                              <FaTrash className="mr-1" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/products/categories/${category.id}`}
                      className="text-blue-500 hover:underline"
                    >
                      View all products in this category
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <a
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </a>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <a
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </a>
                  ))}
                  <a
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </nav>
              </div>
            )}
          </>
        )}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">Sales Analytics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2">Total Sales</h3>
                <p className="text-xl font-bold">
                 
                  {/* Replace with a valid property from PlanLimitsData or remove if not available */}
                  0.00
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2">Total Orders</h3>
                <p className="text-xl font-bold">
                  {/* Replace with a valid property from PlanLimitsData or use a placeholder */}
                  0
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2">Total Products</h3>
                <p className="text-xl font-bold">
                  {/* Replace with a valid property or remove if not available */}
                  0
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2">Total Customers</h3>
                <p className="text-xl font-bold">
                  {/* Replace with a valid property or remove if not available */}
                  0
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/sales"
                className="text-blue-500 hover:underline"
              >
                View detailed sales report
              </Link>
            </div>
          </div>
        )}
      </div>
      {showCategoryModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-black opacity-50 absolute inset-0"></div>
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none py-2 px-3 mb-4"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none py-2 px-3 mb-4"
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleCategoryModalClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md shadow-md hover:bg-gray-400 transition-all mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCategorySave}
                className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600 transition-all"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PlanGuard>
  );
}
function useBranch(): { selectedBranchId: string | null; setSelectedBranchId: (id: string | null) => void } {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  return { selectedBranchId, setSelectedBranchId };
}
interface User {
  branchId?: string;
  permissions?: string[];
  // Add other user properties as needed
}

function useUser(): { user: User | null } {
  // Example implementation using localStorage (replace with your actual auth logic)
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate fetching user from localStorage or API
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  return { user };
}

