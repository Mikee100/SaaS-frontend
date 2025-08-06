"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaBox, FaSearch, FaFilter, FaDownload, FaPlus, FaMinus, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaChartBar, FaHistory, FaEdit, FaEye } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  price?: number;
  category?: string;
}

interface InventoryItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  updatedAt: string;
}

interface InventoryStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  lowStock: number;
  totalValue: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const itemsPerPage = 12;
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(0);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick actions
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/products"),
      apiGet("/inventory"),
    ]).then(([products, inventory]) => {
      setProducts(products);
      setInventory(inventory);
    }).finally(() => setLoading(false));
  }, []);

  // Helper: get inventory record for a product
  function getInv(productId: string) {
    return inventory.find(i => i.product.id === productId);
  }

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Calculate statistics
  const stats: InventoryStats = {
    totalProducts: products.length,
    inStock: products.filter(p => {
      const inv = getInv(p.id);
      return inv && inv.quantity > 0;
    }).length,
    outOfStock: products.filter(p => {
      const inv = getInv(p.id);
      return !inv || inv.quantity === 0;
    }).length,
    lowStock: products.filter(p => {
      const inv = getInv(p.id);
      return inv && inv.quantity > 0 && inv.quantity <= 5;
    }).length,
    totalValue: products.reduce((sum, p) => {
      const inv = getInv(p.id);
      return sum + ((inv?.quantity || 0) * (p.price || 0));
    }, 0)
  };

  // Filtering
  const filtered = products.filter(p => {
    const inv = getInv(p.id);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    
    if (stockFilter === "in") return matchesSearch && matchesCategory && inv && inv.quantity > 0;
    if (stockFilter === "out") return matchesSearch && matchesCategory && (!inv || inv.quantity === 0);
    if (stockFilter === "low") return matchesSearch && matchesCategory && inv && inv.quantity > 0 && inv.quantity <= 5;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filtered.slice(startIndex, endIndex);
  useEffect(() => { setCurrentPage(1); }, [search, stockFilter, categoryFilter]);

  // Modal handlers
  function openStockModal(product: Product) {
    setModalProduct(product);
    setModalQuantity(getInv(product.id)?.quantity || 0);
    setModalError("");
    setShowModal(true);
  }

  async function handleStockSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modalProduct) return;
    setSaving(true);
    setModalError("");
    try {
      await apiPost("/inventory", { productId: modalProduct.id, quantity: Number(modalQuantity) });
      setShowModal(false);
      setModalProduct(null);
      setModalQuantity(0);
      setTimeout(() => {
        apiGet<InventoryItem[]>("/inventory").then(setInventory);
      }, 300);
    } catch (err: any) {
      setModalError(err.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(quantity: number) {
    if (quantity === 0) return { status: "out", color: "text-red-600", bg: "bg-red-50", icon: <FaTimesCircle /> };
    if (quantity <= 5) return { status: "low", color: "text-orange-600", bg: "bg-orange-50", icon: <FaExclamationTriangle /> };
    return { status: "in", color: "text-green-600", bg: "bg-green-50", icon: <FaCheckCircle /> };
  }

  function StatCard({ title, value, icon, color, bg }: { title: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
    return (
      <div className={`${bg} rounded-lg p-4 border border-gray-200`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
            {icon}
          </div>
        </div>
      </div>
    );
  }

  function ProductCard({ product }: { product: Product }) {
    const inv = getInv(product.id);
    const quantity = inv?.quantity || 0;
    const stockStatus = getStockStatus(quantity);
    const lastUpdated = inv ? new Date(inv.updatedAt).toLocaleDateString() : 'Never';

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
            {product.category && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {product.category}
              </span>
            )}
          </div>
          <div className={`p-2 rounded-full ${stockStatus.bg}`}>
            <div className={`${stockStatus.color}`}>
              {stockStatus.icon}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Quantity</span>
            <span className={`font-semibold ${stockStatus.color}`}>{quantity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-xs text-gray-500">{lastUpdated}</span>
          </div>
          {product.price && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Value</span>
              <span className="text-sm font-medium">${(quantity * product.price).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openStockModal(product)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FaEdit className="inline w-3 h-3 mr-1" />
            {inv ? 'Edit' : 'Add'}
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            <FaEye className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Management</h1>
              <p className="text-gray-600">Manage your product stock levels</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                <FaDownload className="inline w-4 h-4 mr-1" />
                Export
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <FaPlus className="inline w-4 h-4 mr-1" />
                Add Product
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Products" 
              value={stats.totalProducts} 
              icon={<FaBox className="w-5 h-5" />} 
              color="text-blue-600" 
              bg="bg-blue-50" 
            />
            <StatCard 
              title="In Stock" 
              value={stats.inStock} 
              icon={<FaCheckCircle className="w-5 h-5" />} 
              color="text-green-600" 
              bg="bg-green-50" 
            />
            <StatCard 
              title="Out of Stock" 
              value={stats.outOfStock} 
              icon={<FaTimesCircle className="w-5 h-5" />} 
              color="text-red-600" 
              bg="bg-red-50" 
            />
            <StatCard 
              title="Low Stock" 
              value={stats.lowStock} 
              icon={<FaExclamationTriangle className="w-5 h-5" />} 
              color="text-orange-600" 
              bg="bg-orange-50" 
            />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Stock</option>
                <option value="in">In Stock</option>
                <option value="out">Out of Stock</option>
                <option value="low">Low Stock</option>
              </select>
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              <div className="flex border border-gray-200 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "grid" 
                      ? "bg-blue-600 text-white" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "list" 
                      ? "bg-blue-600 text-white" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {currentProducts.length === 0 ? (
          <div className="text-center py-12">
            <FaBox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {currentProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentProducts.map(product => {
                        const inv = getInv(product.id);
                        const quantity = inv?.quantity || 0;
                        const stockStatus = getStockStatus(quantity);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.category && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {product.category}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-semibold ${stockStatus.color}`}>{quantity}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                                {stockStatus.icon}
                                {stockStatus.status === "in" ? "In Stock" : stockStatus.status === "low" ? "Low Stock" : "Out of Stock"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {inv ? new Date(inv.updatedAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => openStockModal(product)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                              >
                                {inv ? 'Edit' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="mx-4 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Add/Edit Stock Modal */}
        {showModal && modalProduct && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {getInv(modalProduct.id) ? 'Edit Stock' : 'Add Stock'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleStockSave}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <input
                    type="text"
                    value={modalProduct.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={modalQuantity}
                    onChange={e => setModalQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                {modalError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {modalError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" 
                    onClick={() => setShowModal(false)} 
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" 
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 