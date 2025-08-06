"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaBox, FaSync, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaPlus, FaEdit } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
}

interface InventoryItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  updatedAt: string;
}

interface ComparisonData {
  product: Product;
  inventory: InventoryItem | null;
  isSynced: boolean;
  stockDifference: number;
}

export default function InventoryTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testProduct, setTestProduct] = useState<Product | null>(null);
  const [testQuantity, setTestQuantity] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Create comparison data whenever products or inventory changes
    const comparison = products.map(product => {
      const inventoryItem = inventory.find(inv => inv.product.id === product.id);
      const isSynced = inventoryItem ? inventoryItem.quantity === product.stock : product.stock === 0;
      const stockDifference = inventoryItem ? inventoryItem.quantity - product.stock : 0;
      
      return {
        product,
        inventory: inventoryItem || null,
        isSynced,
        stockDifference
      };
    });
    setComparisonData(comparison);
  }, [products, inventory]);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsData, inventoryData] = await Promise.all([
        apiGet("/products"),
        apiGet("/inventory")
      ]);
      setProducts(productsData);
      setInventory(inventoryData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateInventory(productId: string, quantity: number) {
    setUpdating(true);
    try {
      await apiPost("/inventory", { productId, quantity });
      // Refresh data after update
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (error) {
      console.error("Error updating inventory:", error);
    } finally {
      setUpdating(false);
    }
  }

  function getSyncStatusIcon(isSynced: boolean) {
    if (isSynced) {
      return <FaCheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <FaExclamationTriangle className="w-5 h-5 text-red-600" />;
    }
  }

  function getStockStatusColor(quantity: number) {
    if (quantity === 0) return "text-red-600";
    if (quantity <= 5) return "text-orange-600";
    return "text-green-600";
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory test data...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Synchronization Test</h1>
              <p className="text-gray-600">Compare inventory data with product stock data</p>
            </div>
            <button
              onClick={fetchData}
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FaSync className="inline w-4 h-4 mr-2" />
              Refresh Data
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
                <FaBox className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Records</p>
                  <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
                </div>
                <FaBox className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Synced</p>
                  <p className="text-2xl font-bold text-green-600">
                    {comparisonData.filter(item => item.isSynced).length}
                  </p>
                </div>
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Sync</p>
                  <p className="text-2xl font-bold text-red-600">
                    {comparisonData.filter(item => !item.isSynced).length}
                  </p>
                </div>
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Inventory Update</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
              <select
                value={testProduct?.id || ""}
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  setTestProduct(product || null);
                  setTestQuantity(product?.stock || 0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Current Stock: {product.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Quantity</label>
              <input
                type="number"
                value={testQuantity}
                onChange={(e) => setTestQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => testProduct && updateInventory(testProduct.id, testQuantity)}
                disabled={!testProduct || updating}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {updating ? "Updating..." : "Update Inventory"}
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Inventory vs Product Stock Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  comparisonData.map((item) => (
                    <tr key={item.product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${getStockStatusColor(item.product.stock)}`}>
                          {item.product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${getStockStatusColor(item.inventory?.quantity || 0)}`}>
                          {item.inventory?.quantity || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getSyncStatusIcon(item.isSynced)}
                          <span className={`text-sm font-medium ${item.isSynced ? 'text-green-600' : 'text-red-600'}`}>
                            {item.isSynced ? 'Synced' : 'Out of Sync'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${item.stockDifference === 0 ? 'text-gray-500' : 'text-red-600'}`}>
                          {item.stockDifference === 0 ? 'No difference' : `${item.stockDifference > 0 ? '+' : ''}${item.stockDifference}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => updateInventory(item.product.id, item.product.stock)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          Sync to Product Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How to Test:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Select a product and set a new quantity in the test section above</li>
            <li>2. Click "Update Inventory" to update the inventory record</li>
            <li>3. Check if the product stock field gets synchronized automatically</li>
            <li>4. Use the "Sync to Product Stock" button to manually sync if needed</li>
            <li>5. Refresh the data to see the latest state</li>
          </ol>
        </div>
      </div>
    </AuthGuard>
  );
} 