import React from "react";
import type { Transaction } from "../types";
import Pagination, { usePagination } from "./Pagination";

export default function TransactionsTab({
  transactions,
  formatCurrency,
  formatDate,
}: {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}) {
  const { page, setPage, totalPages, pageItems } = usePagination(transactions);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">All Transactions ({transactions.length})</h3>
      </div>
      {transactions.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No transactions yet.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {pageItems.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium text-gray-900">#{transaction.id.slice(-8)}</span>
                <span className="text-gray-500">{formatDate(transaction.createdAt)}</span>
                <span className="font-medium text-gray-900">{formatCurrency(transaction.total)}</span>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
