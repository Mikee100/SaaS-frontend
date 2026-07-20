import React from "react";
import type { Product, Transaction } from "../types";

export default function OverviewTab({
  products,
  transactions,
  formatCurrency,
  formatDate,
}: {
  products: Product[];
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Products</h3>
        {products.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span className="text-gray-500">
                  {formatCurrency(product.price)} • Stock: {product.stock}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-gray-900">{formatCurrency(transaction.total)}</span>
                <span className="text-gray-500">{formatDate(transaction.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
