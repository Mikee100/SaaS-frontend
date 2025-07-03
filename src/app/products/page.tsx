"use client";
import { useEffect, useState } from "react";
import { apiPost, apiDelete, apiPut } from "@/utils/api";
import QRCode from "qrcode.react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      setProducts(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/products", {
        ...form,
        price: parseFloat(form.price),
      });
      setShowModal(false);
      setForm({ name: "", sku: "", price: "", description: "" });
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editProduct) {
        await apiPut(`/products/${editProduct.id}`, {
          ...form,
          price: parseFloat(form.price),
        });
        setEditProduct(null);
      }
      setShowModal(false);
      setForm({ name: "", sku: "", price: "", description: "" });
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(product: Product) {
    setEditProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      description: product.description || "",
    });
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiDelete(`/products/${id}`);
    fetchProducts();
  }

  const filteredProducts = (products || []).filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || products === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Products</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <input
        type="text"
        placeholder="Search by name or SKU"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border rounded w-full max-w-xs"
      />
      <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 text-left">Name</th>
            <th className="py-2 px-4 text-left">SKU</th>
            <th className="py-2 px-4 text-left">Price</th>
            <th className="py-2 px-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2 px-4">{p.name}</td>
              <td className="py-2 px-4">{p.sku}</td>
              <td className="py-2 px-4">${p.price.toFixed(2)}</td>
              <td className="py-2 px-4">
                <button onClick={() => openEditModal(p)} className="text-blue-600 mr-2">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form
            onSubmit={editProduct ? handleEditProduct : handleAddProduct}
            className="bg-white p-6 rounded shadow-lg w-full max-w-md space-y-4"
          >
            <h3 className="text-lg font-bold mb-2">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="SKU"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              required
              min="0"
              step="0.01"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditProduct(null); }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? (editProduct ? "Saving..." : "Adding...") : (editProduct ? "Save" : "Add")}
              </button>
            </div>
          </form>
        </div>
      )}
      <QRCode
        value={JSON.stringify({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          description: p.description,
          // add more fields as needed
        })}
        size={128}
      />
    </div>
  );
} 