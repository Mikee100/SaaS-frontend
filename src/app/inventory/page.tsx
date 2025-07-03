"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../utils/api";
import { jwtDecode } from "jwt-decode";

interface InventoryItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: 0 });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<InventoryItem[]>("/inventory").then(setInventory).finally(() => setLoading(false));
    apiGet<Product[]>("/products").then(setProducts);
  }, []);

  const refreshInventory = () => {
    setLoading(true);
    apiGet<InventoryItem[]>("/inventory").then(setInventory).finally(() => setLoading(false));
  };

  const openModal = () => {
    setForm({ productId: products[0]?.id || "", quantity: 0 });
    setFormError("");
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || Number(form.quantity) < 0) {
      setFormError("Please select a product and enter a valid quantity.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/inventory", { productId: form.productId, quantity: Number(form.quantity) });
      setShowModal(false);
      refreshInventory();
    } catch (err: any) {
      setFormError(err.message || "Failed to add stock");
    } finally {
      setSubmitting(false);
    }
  };

  function getUserFromToken() {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      return jwtDecode(token) as { role?: string };
    } catch {
      return null;
    }
  }
  const user = getUserFromToken();
  if (!user) {
    return false;
  }
  const canEdit = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        {canEdit && <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={openModal}>Add Stock</button>}
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
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id}>
                <td className="py-2 px-4 border-b">{item.product.name}</td>
                <td className="py-2 px-4 border-b">{item.quantity}</td>
                <td className="py-2 px-4 border-b">{new Date(item.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Stock</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1">Product</label>
                <select
                  name="productId"
                  value={form.productId}
                  onChange={handleFormChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                >
                  <option value="" disabled>Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min={0}
                  value={form.quantity}
                  onChange={handleFormChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              {formError && <div className="text-red-600 mb-2">{formError}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={submitting}>{submitting ? "Adding..." : "Add Stock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 