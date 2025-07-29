"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";

interface Product {
  id: string;
  name: string;
}
interface InventoryItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  updatedAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(0);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Filtering
  const filtered = products.filter(p => {
    const inv = getInv(p.id);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (stockFilter === "in") return matchesSearch && inv && inv.quantity > 0;
    if (stockFilter === "out") return matchesSearch && (!inv || inv.quantity === 0);
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filtered.slice(startIndex, endIndex);
  useEffect(() => { setCurrentPage(1); }, [search, stockFilter]);

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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name..."
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50"
            style={{ minWidth: 220 }}
          />
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50"
          >
            <option value="all">All</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white border rounded shadow">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Product</th>
              <th className="py-2 px-4 border-b">Quantity</th>
              <th className="py-2 px-4 border-b">Last Updated</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No products found.</td></tr>
            ) : (
              currentProducts.map(product => {
                const inv = getInv(product.id);
                return (
                  <tr key={product.id}>
                    <td className="py-2 px-4 border-b">{product.name}</td>
                    <td className="py-2 px-4 border-b">{inv ? inv.quantity : 0}</td>
                    <td className="py-2 px-4 border-b">{inv ? new Date(inv.updatedAt).toLocaleString() : '-'}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        className="px-3 py-1 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 text-xs font-medium transition"
                        onClick={() => openStockModal(product)}
                      >
                        {inv ? 'Edit Stock' : 'Add Stock'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="mx-2 text-sm">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      {/* Add/Edit Stock Modal */}
      {showModal && modalProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{getInv(modalProduct.id) ? 'Edit Stock' : 'Add Stock'}</h2>
            <form onSubmit={handleStockSave}>
              <div className="mb-4">
                <label className="block mb-1">Product</label>
                <input
                  type="text"
                  value={modalProduct.name}
                  disabled
                  className="w-full border px-3 py-2 rounded bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={modalQuantity}
                  onChange={e => setModalQuantity(Number(e.target.value))}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              {modalError && <div className="text-red-600 mb-2">{modalError}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 