import React from "react";
import type { Product } from "../types";
import Pagination, { usePagination } from "./Pagination";

export default function ProductsTab({
  products,
  formatCurrency,
}: {
  products: Product[];
  formatCurrency: (amount: number) => string;
}) {
  const { page, setPage, totalPages, pageItems } = usePagination(products);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">All Products ({products.length})</h3>
      </div>
      {products.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No products yet.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {pageItems.map((product) => (
              <div key={product.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span className="text-gray-500">
                  {formatCurrency(product.price)} • Stock: {product.stock}
                  {product.hasVariations ? " (variant-tracked)" : ""}
                </span>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
