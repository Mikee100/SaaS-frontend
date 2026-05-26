"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { Bar } from "react-chartjs-2";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useTenant } from '@/hooks/useTenant';
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfFontSize,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  type PdfTemplate,
  preparePdfWatermark,
} from '@/utils/pdfTemplate';
import { getFullAssetUrl } from '@/utils/logoUrl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {  FaFilePdf, FaFileExcel, FaExclamationTriangle } from "react-icons/fa";
import { useBranch } from "@/contexts/BranchContext";
import { productVariationsApi } from '@/lib/api/product-variations';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type Product = { id: string; name: string; stock?: number; minStock?: number; price?: number };
type VariationStockRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
};

export default function LowStockAlertsReportPage() {
  const branchContext = useBranch();
  const selectedBranchId = branchContext?.selectedBranchId;
  const { data: tenantData } = useTenant();
  const [products, setProducts] = useState<VariationStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const LOW_STOCK_THRESHOLD = 10;

  useEffect(() => {
    const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
    apiGet("/products", headers)
      .then(async (data) => {
        const baseProducts = Array.isArray(data)
          ? (data as Product[])
          : (data as { products?: Product[] })?.products || [];

        const variationsByProduct = await Promise.all(
          baseProducts.map(async (product) => {
            const variations = await productVariationsApi.getByProduct(product.id).catch(() => []);
            return variations.map((variation) => {
              const attributesLabel = Object.values(variation.attributes || {}).join(' / ');
              const variationName = attributesLabel ? `${product.name} - ${attributesLabel}` : `${product.name} - ${variation.sku}`;
              return {
                id: variation.id,
                name: variationName,
                sku: variation.sku,
                stock: variation.stock || 0,
                minStock: product.minStock || LOW_STOCK_THRESHOLD,
                price: variation.price ?? product.price ?? 0,
              } as VariationStockRow;
            });
          }),
        );

        setProducts(variationsByProduct.flat());
      })
      .catch((err: unknown) =>
        setError((err as Error).message || "An error occurred while fetching data.")
      )
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const lowStockProducts = products.filter(p => (p.stock || 0) <= LOW_STOCK_THRESHOLD && (p.stock || 0) > 0);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  const lowStockData = {
    labels: lowStockProducts.map(p => p.name),
    datasets: [{
      label: 'Current Stock',
      data: lowStockProducts.map(p => p.stock || 0),
      backgroundColor: '#f59e0b',
      borderRadius: 4,
    }],
  };

  const exportToPDF = async () => {
    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Low Stock Alerts Report', margin, yPosition + 8);
    yPosition += 18;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor('666666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Low Stock Items: ${lowStockProducts.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Out of Stock Items: ${outOfStockProducts.length}`, margin, yPosition);
    yPosition += 14;

    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Low Stock Variations', margin, yPosition);
    yPosition += 10;
    const lowRows = lowStockProducts.map((p, i) => [i + 1, p.name, p.sku, p.stock || 0]);
    if (lowRows.length) {
      autoTable(doc, {
        head: [['#', 'Variation', 'SKU', 'Stock']],
        body: lowRows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }
    doc.setFontSize(fontSize);
    doc.setTextColor((pdfTemplate.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text('Out of Stock Variations', margin, yPosition);
    yPosition += 10;
    const outRows = outOfStockProducts.map((p, i) => [i + 1, p.name, p.sku, '0']);
    if (outRows.length) {
      autoTable(doc, {
        head: [['#', 'Variation', 'SKU', 'Stock']],
        body: outRows,
        startY: yPosition,
        styles: { fontSize: fontSize - 2, cellPadding: 3 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: secondaryRgb },
        margin: { left: margin, right: margin },
      });
    }

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, 'SaaS POS • Low Stock');
    doc.save('low_stock_alerts_report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['Metric', 'Value'],
      ['Low Stock Items', lowStockProducts.length],
      ['Out of Stock Items', outOfStockProducts.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const lowStockData = [
      ['Variation', 'SKU', 'Current Stock', 'Min Stock'],
      ...lowStockProducts.map(p => [p.name, p.sku, p.stock || 0, p.minStock || LOW_STOCK_THRESHOLD])
    ];
    const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
    XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Items');

    const outOfStockData = [
      ['Variation', 'SKU'],
      ...outOfStockProducts.map(p => [p.name, p.sku])
    ];
    const outOfStockSheet = XLSX.utils.aoa_to_sheet(outOfStockData);
    XLSX.utils.book_append_sheet(workbook, outOfStockSheet, 'Out of Stock Items');

    XLSX.writeFile(workbook, 'low_stock_alerts_report.xlsx');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-75">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md" role="alert">
          <strong className="font-bold">Failed to load data:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Low Stock Alerts Report</h1>
              <p className="mt-1 text-xs text-gray-500">Variations below minimum stock levels requiring attention.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-xs"
              >
                <FaFilePdf /> PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-xs"
              >
                <FaFileExcel /> Excel
              </button>
            </div>
          </div>
        </header>

        {/* Alert Summary */}
        <div className="mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="text-sm font-semibold text-orange-900">Stock Alert Summary</h3>
                <p className="text-xs text-orange-700">
                  {lowStockProducts.length} low stock, {outOfStockProducts.length} out of stock.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Key Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Low Stock Items</span>
              <span className="text-sm font-semibold text-gray-900">{lowStockProducts.length}</span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Out of Stock Items</span>
              <span className="text-sm font-semibold text-gray-900">{outOfStockProducts.length}</span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Total Alerts</span>
              <span className="text-sm font-semibold text-gray-900">{lowStockProducts.length + outOfStockProducts.length}</span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Healthy Stock</span>
              <span className="text-sm font-semibold text-gray-900">{products.length - lowStockProducts.length - outOfStockProducts.length}</span>
            </div>
          </div>
        </section>

        {/* Additional Stock Insights */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Stock Insights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Total Variations</span>
              <span className="text-sm font-semibold text-gray-900">{products.length}</span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Average Stock per Variation</span>
              <span className="text-sm font-semibold text-gray-900">
                {products.length > 0 ? (products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length).toFixed(1) : '0'}
              </span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Total Stock Value</span>
              <span className="text-sm font-semibold text-gray-900">
                {products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-gray-50 rounded p-2 flex flex-col border border-gray-200">
              <span className="text-xs text-gray-600">Low Stock Value</span>
              <span className="text-sm font-semibold text-gray-900">
                {lowStockProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Detailed Stock Table */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Detailed Stock Levels</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Variation</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">SKU</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Stock</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Min Stock</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Price</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="py-2 px-4 text-xs text-gray-700">{product.name}</td>
                    <td className="py-2 px-4 text-xs text-gray-700">{product.sku}</td>
                    <td className="py-2 px-4 text-xs text-gray-700">{product.stock}</td>
                    <td className="py-2 px-4 text-xs text-gray-700">{product.minStock}</td>
                    <td className="py-2 px-4 text-xs text-gray-700">{product.price?.toLocaleString()}</td>
                    <td className="py-2 px-4 text-xs text-gray-700">
                      {(product.stock * (product.price || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Low Stock Chart */}
        {lowStockProducts.length > 0 && (
          <section className="mb-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Low Stock Levels</h2>
            <div className="bg-white rounded border border-gray-200 p-3">
              <div className="h-40">
                <Bar
                  data={lowStockData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `Stock: ${context.parsed.y}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                      },
                      x: {
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
