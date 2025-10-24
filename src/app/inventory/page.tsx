"use client";
import { apiGet, apiPost } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaBox, FaSearch,  FaPlus, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaEdit, FaCalculator, FaDownload } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { useBranch } from "@/contexts/BranchContext";
import { useEffect, useState } from "react";
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  price?: number;
  cost?: number;
  category?: string;
  sku?: string;
}

interface InventoryItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  updatedAt: string;
}



export default function InventoryPage() {
  const { user } = useUser(); // Pass an empty array as required by the hook
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const setSelectedBranchId = branchContext?.setSelectedBranchId;
  
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

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;

    Promise.all([
      apiGet("/products", headers),
      apiGet("/inventory", headers),
    ])
      .then(([products, inventory]) => {
        setProducts(Array.isArray(products) ? products : []);
        setInventory(Array.isArray(inventory) ? inventory : []);
      })
      .catch(error => {
        console.error("Error fetching inventory data:", error);
        // Optionally set error state to show to the user
      })
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const data = await apiGet('/api/branches');
        if (Array.isArray(data)) {
          setBranches(data as { id: string; name: string }[]);
          // Auto-select first branch if none selected
          if (!selectedBranchId && data.length > 0) {
            setSelectedBranchId(data[0].id);
          }
        } else {
          setBranches([]);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setBranchesLoading(false);
      }
    }
    fetchBranches();
  }, [selectedBranchId, setSelectedBranchId]);

  // Helper: get inventory record for a product
  function getInv(productId: string) {
    return inventory.find(i => i.product.id === productId);
  }

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Calculate statistics
  const stats = {
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
    }, 0),
    totalCostValue: products.reduce((sum, p) => {
      const inv = getInv(p.id);
      return sum + ((inv?.quantity || 0) * (p.cost || 0));
    }, 0),
    totalProfit: products.reduce((sum, p) => {
      const inv = getInv(p.id);
      const quantity = inv?.quantity || 0;
      const price = p.price || 0;
      const cost = p.cost || 0;
      return sum + (quantity * (price - cost));
    }, 0),
    averageMargin: (() => {
      const productsWithCost = products.filter(p => p.cost && p.price && p.cost > 0);
      if (productsWithCost.length === 0) return 0;
      const totalMargin = productsWithCost.reduce((sum, p) => {
        return sum + (((p.price! - p.cost!) / p.price!) * 100);
      }, 0);
      return totalMargin / productsWithCost.length;
    })(),
    lowMarginProducts: products.filter(p => {
      if (!p.cost || !p.price || p.price === 0) return false;
      const margin = ((p.price - p.cost) / p.price) * 100;
      return margin < 20; // Low margin threshold
    }).length
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
        const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
        apiGet("/inventory", headers).then((data) => setInventory(data as InventoryItem[]));
      }, 300);
    } catch (err: unknown) {
      const error = err as Error;
      setModalError(error.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(quantity: number) {
    if (quantity === 0) return { status: "out", color: "text-red-600", bg: "bg-red-50", icon: <FaTimesCircle />, text: "Out of Stock" };
    if (quantity <= 5) return { status: "low", color: "text-orange-600", bg: "bg-orange-50", icon: <FaExclamationTriangle />, text: "Low Stock" };
    return { status: "in", color: "text-green-600", bg: "bg-green-50", icon: <FaCheckCircle />, text: "In Stock" };
  }

  // Modern StatCard
  function StatCard({ title, value, icon, color, bg }: { title: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
    return (
      <div className={`flex items-center gap-3 ${bg} rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}>
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color} bg-opacity-10`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500">{title}</p>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
        </div>
      </div>
    );
  }

  // Modern ProductCard
  function ProductCard({ product }: { product: Product }) {
    const inv = getInv(product.id);
    const stockStatus = getStockStatus(inv?.quantity || 0);
    const canEditInventory = hasPermission(user, 'edit_inventory');
    const quantity = inv?.quantity || 0;
    const cost = product.cost || 0;
    const price = product.price || 0;
    const profitPerUnit = price - cost;
    const totalValue = quantity * price;
    const totalProfit = quantity * profitPerUnit;
    const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;

    const getMarginColor = (margin: number) => {
      if (margin >= 30) return 'text-green-600';
      if (margin >= 20) return 'text-yellow-600';
      if (margin >= 0) return 'text-orange-600';
      return 'text-red-600';
    };

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col gap-2 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">{product.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{product.category || 'Uncategorized'}</span>
              {product.sku && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{product.sku}</span>
              )}
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${stockStatus.color} ${stockStatus.bg}`}>
            {stockStatus.text}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div>
            <span className="text-gray-400">Stock</span>
            <div className="font-bold">{quantity}</div>
          </div>
          <div>
            <span className="text-gray-400">Price</span>
            <div className="font-bold">${price.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-400">Cost</span>
            <div className="font-bold">${cost.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-400">Margin</span>
            <div className={`font-bold ${getMarginColor(marginPercent)}`}>{marginPercent.toFixed(1)}%</div>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs border-t pt-2">
          <span className="text-gray-400">Total Value</span>
          <span className="font-bold text-green-600">${totalValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Total Profit</span>
          <span className={`font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${totalProfit.toFixed(2)}</span>
        </div>
        <div className="flex mt-2">
          {canEditInventory ? (
            <button
              onClick={() => openStockModal(product)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
            >
              <FaEdit className="w-3 h-3 inline mr-1" />
              Update Stock
            </button>
          ) : (
            <Tooltip content="You don't have permission to edit inventory. Contact your administrator.">
              <button
                disabled
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed text-xs font-semibold"
              >
                <FaEdit className="w-3 h-3 inline mr-1" />
                Update Stock
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view inventory
  if (!hasPermission(user, 'view_inventory')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view inventory.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-2 py-4">
        {/* Modern Top Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-fade-in">
          {/* Branch Selector */}
          <div className="flex-shrink-0 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Branch</label>
            {branchesLoading ? (
              <div className="text-gray-400 text-xs">Loading branches...</div>
            ) : (
              <select
                value={selectedBranchId || ''}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow text-xs min-w-[140px] font-semibold"
              >
                <option value="" disabled>Select a branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
          </div>
          {/* Title and Statistics */}
          <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Smart Inventory</h1>
              <p className="text-gray-500 text-sm">Stock management & cost analysis</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                title="Total Products"
                value={stats.totalProducts}
                icon={<FaBox className="w-5 h-5" />}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <StatCard
                title="Inventory Value"
                value={`$${stats.totalValue.toLocaleString()}`}
                icon={<FaCalculator className="w-5 h-5" />}
                color="text-green-600"
                bg="bg-green-50"
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
            </div>
          </div>
        </div>

        {/* Sticky Filters/Actions Bar */}
        <div className="sticky top-2 z-10 bg-white rounded-xl shadow border border-gray-100 p-3 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 animate-fade-in">
          <div className="flex-1 flex gap-2">
            <div className="relative w-full max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
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
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === "grid" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === "list" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                List
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const data = filtered.map(product => {
                  const inv = getInv(product.id);
                  const quantity = inv?.quantity || 0;
                  const cost = product.cost || 0;
                  const price = product.price || 0;
                  const profitPerUnit = price - cost;
                  const totalValue = quantity * price;
                  const totalProfit = quantity * profitPerUnit;
                  const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;

                  return {
                    'Product Name': product.name,
                    'SKU': product.sku || '',
                    'Category': product.category || '',
                    'Stock': quantity,
                    'Cost': cost,
                    'Price': price,
                    'Margin %': marginPercent.toFixed(1),
                    'Total Value': totalValue.toFixed(2),
                    'Total Profit': totalProfit.toFixed(2),
                    'Status': quantity === 0 ? 'Out of Stock' : quantity <= 5 ? 'Low Stock' : 'In Stock'
                  };
                });

                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
                XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold shadow"
            >
              <FaDownload className="w-4 h-4" />
              Export
            </button>
            {hasPermission(user, 'create_inventory') && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow"
              >
                <FaPlus className="w-4 h-4" />
                Bulk Update
              </button>
            )}
          </div>
        </div>

        {/* Products Grid/List */}
        {currentProducts.length === 0 ? (
          <div className="text-center py-16">
            <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
                {currentProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden mb-6 animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentProducts.map(product => {
                        const inv = getInv(product.id);
                        const quantity = inv?.quantity || 0;
                        const stockStatus = getStockStatus(quantity);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.category && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {product.category}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-bold ${stockStatus.color}`}>{quantity}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${stockStatus.bg} ${stockStatus.color}`}>
                                {stockStatus.icon}
                                {stockStatus.status === "in" ? "In Stock" : stockStatus.status === "low" ? "Low Stock" : "Out of Stock"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {inv ? new Date(inv.updatedAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => openStockModal(product)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
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
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-semibold"
            >
              Previous
            </button>
            <span className="mx-4 text-sm text-gray-500 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-semibold"
            >
              Next
            </button>
          </div>
        )}

        {/* Add/Edit Stock Modal */}
        {showModal && modalProduct && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-100 relative animate-fade-in">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimesCircle className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {getInv(modalProduct.id) ? 'Edit Stock' : 'Add Stock'}
              </h2>
              <form onSubmit={handleStockSave}>
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
                  <input
                    type="text"
                    value={modalProduct.name}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-semibold"
                  />
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={modalQuantity}
                    onChange={e => setModalQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                    required
                  />
                </div>
                {modalError && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold">
                    {modalError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    className="px-5 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold" 
                    onClick={() => setShowModal(false)} 
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold" 
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