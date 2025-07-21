"use client";
import { useEffect, useState } from "react";
import { apiPost, apiDelete, apiPut } from "@/utils/api";
import * as XLSX from 'xlsx';
import { useSocket } from '@/components/SocketContext';

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
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [qrCodeProductId, setQrCodeProductId] = useState<string | null>(null);

  const socket = useSocket();

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      fetchProducts();
    };
    socket.on('inventoryUpdate', handler);
    socket.on('salesUpdate', handler);
    return () => {
      socket.off('inventoryUpdate', handler);
      socket.off('salesUpdate', handler);
    };
  }, [socket]);

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
      setForm({});
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
      setForm({});
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
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/products/bulk-upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
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
    while (!finished) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/bulk-upload-progress/${uploadId}`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/clear-all`, {
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

  const filteredProducts = (products || []).filter(
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

  // Dynamically determine all unique columns (excluding id, createdAt, updatedAt, tenantId, and customFields)
  const allColumnsSet = new Set<string>();
  (products || []).forEach((p) => {
    Object.keys(flattenProduct(p)).forEach((k) => {
      if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'customFields'].includes(k)) {
        allColumnsSet.add(k);
      }
    });
  });
  const allColumns = Array.from(allColumnsSet);

  const editableColumns = allColumns.filter(
    (col) => !['id', 'createdAt', 'updatedAt', 'tenantId'].includes(col)
  );

  if (loading || products === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6  top-0 z-10 bg-white rounded-t-2xl p-4 border-b border-gray-100">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs text-gray-500 mb-1">Search Products</label>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50"
              style={{ minWidth: 220 }}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">Add Product</button>
            <button onClick={downloadTemplate} className="px-4 py-2 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">Download Template</button>
            <form onSubmit={handleBulkUpload} className="inline-block">
              <input type="file" name="file" accept=".xlsx,.xls,.csv" className="text-xs" />
              <button type="submit" className="ml-2 px-4 py-2 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">Bulk Upload</button>
            </form>
            <button onClick={handleClearAll} className="px-4 py-2 rounded bg-red-50 border border-red-200 hover:bg-red-100 font-medium text-sm text-red-700 transition">Clear All</button>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {/* Dynamically render columns */}
                {Array.from(allColumnsSet).map(col => (
                  <th key={col} className="px-4 py-2 font-semibold text-gray-600 border-b border-gray-100">{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>
                ))}
                <th className="px-4 py-2 font-semibold text-gray-600 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
            <tbody>
              {currentProducts.length === 0 ? (
                <tr><td colSpan={allColumnsSet.size + 1} className="text-center py-8 text-gray-400">No products found.</td></tr>
              ) : (
                currentProducts.map((product) => {
                  const flat = flattenProduct(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      {allColumns.map(col => (
                        <td key={col} className="px-4 py-2 whitespace-nowrap">{flat[col] ?? '-'}</td>
                      ))}
                      <td className="px-4 py-2 flex gap-2">
                        <button onClick={() => openEditModal(product)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => setQrCodeProductId(product.id)} className="text-xs font-medium text-green-600 hover:underline">QR</button>
                        <button onClick={() => handleDelete(product.id)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
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
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editProduct ? 'Edit Product' : 'Add Product'}
                </h3>
              </div>
              <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="p-6 space-y-4">
                {editableColumns.map((col) => (
                  <div key={col}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type={col.toLowerCase().includes('price') ? 'number' : 'text'}
                      placeholder={col}
                      value={form[col] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [col]: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                      required={['name', 'sku', 'price'].includes(col)}
                      min={col.toLowerCase().includes('price') ? '0' : undefined}
                      step={col.toLowerCase().includes('price') ? '0.01' : undefined}
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditProduct(null); }}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={saving}
                  >
            {saving ? (editProduct ? 'Updating...' : 'Saving...') : (editProduct ? 'Update Product' : 'Add Product')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrCodeProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeProductId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Product QR Code</h3>
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}/products/${qrCodeProductId}/qr`}
              alt="Product QR Code"
              className="w-64 h-64 mx-auto"
            />
            <button
              onClick={() => {
                const printWindow = window.open('', '', 'height=400,width=400');
                if (printWindow) {
                  printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                  printWindow.document.write(`<img src="${process.env.NEXT_PUBLIC_API_URL}/products/${qrCodeProductId}/qr" />`);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }
              }}
              className="w-full mt-6 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 