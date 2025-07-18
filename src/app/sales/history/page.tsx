"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { PrinterIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toCSV(rows: any[], columns: string[]): string {
  const escape = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => escape(row[col] ?? '')).join(',')).join('\n');
  return header + '\n' + body;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Filter state
  const [filterCashier, setFilterCashier] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  // Filtering logic
  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const startOk = !filterStart || saleDate >= new Date(filterStart);
    const endOk = !filterEnd || saleDate <= new Date(filterEnd + 'T23:59:59');
    const cashierOk = !filterCashier || sale.cashier === filterCashier;
    const paymentOk = !filterPayment || sale.paymentType === filterPayment;
    return startOk && endOk && cashierOk && paymentOk;
  });
  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 10;
  const pageCount = Math.ceil(filteredSales.length / perPage);
  const pagedSales = filteredSales.slice((page - 1) * perPage, page * perPage);


  useEffect(() => {
    setLoading(true);
    apiGet<any[]>("/sales")
      .then(setSales)
      .catch((err) => setError(err.message || "Failed to fetch sales"))
      .finally(() => setLoading(false));
  }, []);

  // Summary calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalSales = filteredSales.length;

  // Unique values for filters
  const allCashiers = unique(sales.map(s => s.cashier).filter(Boolean));
  const allPayments = unique(sales.map(s => s.paymentType).filter(Boolean));

  // Export CSV handler
  function handleExportCSV() {
    if (!filteredSales.length) return;
    const columns = [
      'saleId', 'date', 'total', 'paymentType', 'customerName', 'customerPhone', 'cashier'
    ];
    const rows = filteredSales.map(sale => ({
      ...sale,
      date: new Date(sale.date).toLocaleString(),
      total: sale.total.toFixed(2),
    }));
    const csv = toCSV(rows, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Excel export handler
  function handleExportExcel() {
    if (!filteredSales.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredSales.map(sale => ({
      ...sale,
      date: new Date(sale.date).toLocaleString(),
      total: sale.total.toFixed(2),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales-history.xlsx');
  }

  // PDF export handler
  function handleExportPDF() {
    if (!filteredSales.length) return;
    const doc = new jsPDF();
    // Header
    doc.setFontSize(18);
    doc.text('Sales History Report', 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    // Table
    const tableColumn = ['Date', 'Sale ID', 'Total', 'Payment', 'Customer', 'Cashier'];
    const tableRows = filteredSales.map(sale => [
      new Date(sale.date).toLocaleString(),
      sale.saleId,
      `$${sale.total.toFixed(2)}`,
      sale.paymentType,
      sale.customerName || '-',
      sale.cashier || '-',
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: 14, right: 14 },
    });
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      doc.text('SaaS POS • Sales Report', 14, doc.internal.pageSize.getHeight() - 10);
    }
    doc.save('sales-history.pdf');
  }

  if (loading) return <div className="p-8">Loading sales...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Sales History</h1>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Start Date</label>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">End Date</label>
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Cashier</label>
          <select value={filterCashier} onChange={e => setFilterCashier(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All</option>
            {allCashiers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Payment</label>
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All</option>
            {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button
          className="ml-auto text-xs text-gray-500 hover:underline"
          onClick={() => { setFilterStart(""); setFilterEnd(""); setFilterCashier(""); setFilterPayment(""); setPage(1); }}
        >
          Clear Filters
        </button>
        <button
          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 ml-2"
          onClick={handleExportCSV}
        >
          Export CSV
        </button>
        <button
          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 ml-2"
          onClick={handleExportExcel}
        >
          Export Excel
        </button>
        <button
          className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-900 ml-2"
          onClick={handleExportPDF}
        >
          Export PDF
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-3 flex-1 min-w-[180px]">
          <div className="text-xs text-blue-700">Total Sales</div>
          <div className="text-2xl font-bold text-blue-900">{totalSales}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3 flex-1 min-w-[180px]">
          <div className="text-xs text-green-700">Total Revenue</div>
          <div className="text-2xl font-bold text-green-900">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        </div>
      </div>
      {filteredSales.length === 0 ? (
        <div className="text-gray-500">No sales found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded shadow mb-4">
            <table className="min-w-full bg-white border text-sm">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Sale ID</th>
                  <th className="py-2 px-4 border-b">Total</th>
                  <th className="py-2 px-4 border-b">Payment</th>
                  <th className="py-2 px-4 border-b">Customer</th>
                  <th className="py-2 px-4 border-b">Cashier</th>
                  <th className="py-2 px-4 border-b">Details</th>
                </tr>
              </thead>
              <tbody>
                {pagedSales.map((sale, idx) => (
                  <>
                    <tr key={sale.saleId} className={"transition hover:bg-blue-50 " + ((idx + (page-1)*perPage) % 2 === 0 ? "bg-gray-50" : "bg-white") }>
                      <td className="py-2 px-4 border-b">{new Date(sale.date).toLocaleString()}</td>
                      <td className="py-2 px-4 border-b font-mono text-xs">{sale.saleId.slice(0, 8)}...</td>
                      <td className="py-2 px-4 border-b font-bold text-green-700">${sale.total.toFixed(2)}</td>
                      <td className="py-2 px-4 border-b">{sale.paymentType}</td>
                      <td className="py-2 px-4 border-b">{sale.customerName || "-"}</td>
                      <td className="py-2 px-4 border-b">{sale.cashier || "-"}</td>
                      <td className="py-2 px-4 border-b flex gap-2 items-center">
                        <button
                          className="text-blue-600 hover:underline flex items-center gap-1"
                          onClick={() => setExpanded(expanded === sale.saleId ? null : sale.saleId)}
                          title={expanded === sale.saleId ? "Hide details" : "Show details"}
                        >
                          {expanded === sale.saleId ? (
                            <ChevronDownIcon className="w-4 h-4 inline" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 inline" />
                          )}
                          {expanded === sale.saleId ? "Hide" : "View"}
                        </button>
                        <button
                          className="text-gray-500 hover:text-blue-700 flex items-center gap-1"
                          onClick={() => {
                            window.print();
                          }}
                          title="Print Receipt"
                        >
                          <PrinterIcon className="w-4 h-4 inline" />
                          <span className="sr-only">Print</span>
                        </button>
                      </td>
                    </tr>
                    {expanded === sale.saleId && (
                      <tr>
                        <td colSpan={7} className="bg-blue-50 px-4 py-2 border-b">
                          <div className="mb-2 font-semibold">Items:</div>
                          <table className="w-full text-xs mb-2">
                            <thead>
                              <tr>
                                <th className="text-left">Item</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item: any) => (
                                <tr key={item.productId}>
                                  <td>{item.name}</td>
                                  <td className="text-right">{item.quantity}</td>
                                  <td className="text-right">${item.price.toFixed(2)}</td>
                                  <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* M-Pesa Transaction Details */}
                          {sale.mpesaTransaction && (
                            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                              <div className="font-bold text-blue-900 mb-2">M-Pesa Transaction</div>
                              <div><span className="font-semibold">Phone:</span> {sale.mpesaTransaction.phoneNumber}</div>
                              <div><span className="font-semibold">Amount:</span> KES {sale.mpesaTransaction.amount}</div>
                              <div><span className="font-semibold">Status:</span> <span className={sale.mpesaTransaction.status === 'success' ? 'text-green-700' : 'text-red-600'}>{sale.mpesaTransaction.status}</span></div>
                              <div><span className="font-semibold">Receipt:</span> {sale.mpesaTransaction.mpesaReceipt || '-'}</div>
                              <div><span className="font-semibold">Message:</span> {sale.mpesaTransaction.message || '-'}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">
              Showing {filteredSales.length === 0 ? 0 : (page - 1) * perPage + 1}
              -{Math.min(page * perPage, filteredSales.length)} of {filteredSales.length} sales
            </div>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="text-xs px-2">Page {page} of {pageCount}</span>
              <button
                className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 