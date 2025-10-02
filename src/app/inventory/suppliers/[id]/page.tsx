"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  cost?: number;
  quantity?: number;
}

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  products: Product[];
}

const SupplierProfilePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch supplier details");
        }
        const data = await response.json();
        setSupplier(data);
      } catch  {
        setError("Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading supplier: {error}
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-4">
        <p>Supplier not found.</p>
        <Link href="/inventory/suppliers" className="text-blue-600 hover:underline">
          Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/inventory/suppliers" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Suppliers
      </Link>
      <h1 className="text-3xl font-bold mb-4">{supplier.name}</h1>
      <div className="mb-6">
        <p><strong>Contact Name:</strong> {supplier.contactName || "-"}</p>
        <p><strong>Email:</strong> {supplier.email || "-"}</p>
        <p><strong>Phone:</strong> {supplier.phone || "-"}</p>
        <p><strong>Address:</strong> {supplier.address || "-"}</p>
        <p><strong>City:</strong> {supplier.city || "-"}</p>
        <p><strong>Country:</strong> {supplier.country || "-"}</p>
        <p><strong>Postal Code:</strong> {supplier.postalCode || "-"}</p>
        <p><strong>Website:</strong> {supplier.website ? <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{supplier.website}</a> : "-"}</p>
        <p><strong>Notes:</strong> {supplier.notes || "-"}</p>
        <p><strong>Status:</strong> {supplier.isActive ? "Active" : "Inactive"}</p>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Products Supplied</h2>
      {supplier.products.length === 0 ? (
        <p>No products found for this supplier.</p>
      ) : (
        <div className="space-y-4">
          {supplier.products.map((product) => (
            <div key={product.id} className="border border-gray-300 rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold">{product.name}</h3>
              <p><strong>SKU:</strong> {product.sku || "-"}</p>
              <p><strong>Price:</strong> {product.price !== undefined ? `$${product.price.toFixed(2)}` : "-"}</p>
              <p><strong>Cost:</strong> {product.cost !== undefined ? `$${product.cost.toFixed(2)}` : "-"}</p>
              <p><strong>Quantity:</strong> {product.quantity !== undefined ? product.quantity : "-"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierProfilePage;
