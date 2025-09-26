"use client";
import { apiGet } from "@/utils/api";
import { PrinterIcon, ChevronDownIcon, ChevronRightIcon, DocumentArrowDownIcon, DocumentTextIcon, DocumentChartBarIcon, CalendarDaysIcon, UserIcon, CreditCardIcon, XMarkIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useEffect, useState } from "react";

type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type MpesaTransaction = {
  phoneNumber: string;
  amount: number;
  status: string;
  mpesaReceipt?: string;
};

type Sale = {
  saleId: string;
  date: string;
  total: number;
  paymentType: string;
  customerName?: string;
  customerPhone?: string;
  cashier?: string;
  items: SaleItem[];
  mpesaTransaction?: MpesaTransaction;
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => escape(row[col] ?? '')).join(',')).join('\n');
  return header + '\n' + body;
}

export default function SalesHistoryPage() {

const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Branch state
  const [branches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Filter state
  const [filterCashier, setFilterCashier] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
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

  // Fetch branches
useEffect(() => {
  setLoading(true);
  apiGet("/sales", selectedBranchId ? { "x-branch-id": selectedBranchId } : undefined)
    .then((data) => setSales(data as Sale[]))
    .catch((err) => setError(err.message || "Failed to fetch sales"))
    .finally(() => setLoading(false));
}, [selectedBranchId]);

  // Fetch sales (filtered by branch)
useEffect(() => {
  setLoading(true);
  apiGet("/sales", selectedBranchId ? { "x-branch-id": selectedBranchId } : undefined)
    .then((data) => setSales(data as Sale[]))
    .catch((err) => setError(err.message || "Failed to fetch sales"))
    .finally(() => setLoading(false));
}, [selectedBranchId]);

  // Summary calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalSales = filteredSales.length;
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

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

  const clearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilterCashier("");
    setFilterPayment("");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium text-lg mb-2">Error Loading Sales Data</div>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales History</h1>
          <p className="text-gray-600">Track and analyze your sales performance</p>
        </div>
        
        {/* Branch Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
            {branchesLoading ? (
              <div className="text-gray-500 text-sm">Loading branches...</div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                style={{ minWidth: 200 }}
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            Filters
            {(filterStart || filterEnd || filterCashier || filterPayment) && (
              <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {[filterStart, filterEnd, filterCashier, filterPayment].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Filter Sales</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <CalendarDaysIcon className="w-4 h-4" />
                Start Date
              </label>
              <input 
                type="date" 
                value={filterStart} 
                onChange={e => setFilterStart(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <CalendarDaysIcon className="w-4 h-4" />
                End Date
              </label>
              <input 
                type="date" 
                value={filterEnd} 
                onChange={e => setFilterEnd(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                Cashier
              </label>
              <select 
                value={filterCashier} 
                onChange={e => setFilterCashier(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Cashiers</option>
                {allCashiers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <CreditCardIcon className="w-4 h-4" />
                Payment Method
              </label>
              <select 
                value={filterPayment} 
                onChange={e => setFilterPayment(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Methods</option>
                {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Clear Filters
            </button>
            
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-200 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-blue-900">{totalSales}</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">Number of completed transactions</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-200 rounded-lg">
              <DocumentChartBarIcon className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">Sum of all transaction values</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-200 rounded-lg">
              <CreditCardIcon className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Average Sale</p>
              <p className="text-2xl font-bold text-purple-900">${avgSaleValue.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">Average value per transaction</p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export CSV
        </button>
        
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-100 border border-green-200 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export Excel
        </button>
        
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export PDF
        </button>
        
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
        >
          <PrinterIcon className="w-5 h-5" />
          Print Report
        </button>
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
          <p className="text-gray-500 mb-4">
            {sales.length === 0 
              ? "No sales have been recorded yet." 
              : "No sales match your current filters."}
          </p>
          {(filterStart || filterEnd || filterCashier || filterPayment) ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Date & Time</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Sale ID</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-600">Total</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Payment</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Customer</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Cashier</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedSales.map((sale, idx) => (
                    <React.Fragment key={sale.saleId}>
                      <tr className={`transition hover:bg-blue-50 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 font-medium">
                            {new Date(sale.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(sale.date).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">
                          {sale.saleId.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-700">
                          ${sale.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.paymentType === 'cash' 
                              ? 'bg-blue-100 text-blue-800' 
                              : sale.paymentType === 'mpesa'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sale.paymentType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {sale.customerName || (
                            <span className="text-gray-400 italic">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {sale.cashier || (
                            <span className="text-gray-400 italic">System</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setExpanded(expanded === sale.saleId ? null : sale.saleId)}
                              className={`p-2 rounded-lg transition-colors ${
                                expanded === sale.saleId 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                              title={expanded === sale.saleId ? "Hide details" : "Show details"}
                            >
                              {expanded === sale.saleId ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </button>
                            
                            <button
                              className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={() => {
                                window.print();
                              }}
                              title="Print Receipt"
                            >
                              <PrinterIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {expanded === sale.saleId && (
                        <tr>
                          <td colSpan={7} className="bg-blue-50 px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Items Table */}
                              <div>
                                <div className="font-semibold text-gray-800 mb-3">Items Purchased</div>
                                <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-xs">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="py-2 px-3 text-left font-medium text-gray-600">Item</th>
                                      <th className="py-2 px-3 text-right font-medium text-gray-600">Qty</th>
                                      <th className="py-2 px-3 text-right font-medium text-gray-600">Price</th>
                                      <th className="py-2 px-3 text-right font-medium text-gray-600">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {sale.items.map((item: SaleItem) => (
                                      <tr key={item.productId}>
                                        <td className="py-2 px-3">{item.name}</td>
                                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                                        <td className="py-2 px-3 text-right">${item.price.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          ${(item.price * item.quantity).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50">
                                    <tr>
                                      <td colSpan={3} className="py-2 px-3 text-right font-medium">Total:</td>
                                      <td className="py-2 px-3 text-right font-bold text-green-700">
                                        ${sale.total.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              
                              {/* Payment Details */}
                              <div>
                                <div className="font-semibold text-gray-800 mb-3">Payment Details</div>
                                <div className="bg-white rounded-lg p-4 shadow-xs">
                                  <div className="space-y-3">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Payment Method:</span>
                                      <span className="font-medium">{sale.paymentType}</span>
                                    </div>
                                    
                                    {sale.mpesaTransaction && (
                                      <>
                                        <div className="pt-3 border-t border-gray-100">
                                          <div className="font-medium text-gray-800 mb-2">M-Pesa Transaction</div>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Phone:</span>
                                              <span>{sale.mpesaTransaction.phoneNumber}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Amount:</span>
                                              <span>KES {sale.mpesaTransaction.amount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Status:</span>
                                              <span className={sale.mpesaTransaction.status === 'success' 
                                                ? 'text-green-600 font-medium' 
                                                : 'text-red-600'
                                              }>
                                                {sale.mpesaTransaction.status}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Receipt:</span>
                                              <span>{sale.mpesaTransaction.mpesaReceipt || '-'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    
                                    {sale.customerName && (
                                      <div className="pt-3 border-t border-gray-100">
                                        <div className="font-medium text-gray-800 mb-1">Customer</div>
                                        <div className="text-sm">
                                          {sale.customerName}
                                          {sale.customerPhone && (
                                            <div className="text-gray-600">{sale.customerPhone}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Showing {filteredSales.length === 0 ? 0 : (page - 1) * perPage + 1}
              -{Math.min(page * perPage, filteredSales.length)} of {filteredSales.length} sales
            </div>
            
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronRightIcon className="w-4 h-4 rotate-180" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  let pageNum;
                  if (pageCount <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pageCount - 2) {
                    pageNum = pageCount - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg transition ${
                        page === pageNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {pageCount > 5 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
              </div>
              
              <button
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}