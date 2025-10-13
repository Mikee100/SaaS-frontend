"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaFileAlt, FaChartBar, FaExclamationTriangle, FaBox, FaShoppingCart, FaUsers, FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { hasPermission } from "@/utils/permissions";
import { useUser } from "@/components/UserContext";

interface Report {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'products' | 'inventory';
  requiredPermission: string;
}

const reports: Report[] = [
  {
    id: 'product-sales',
    title: 'Product Sales Report',
    description: 'Detailed sales performance for each product including revenue, units sold, and trends.',
    icon: FaShoppingCart,
    category: 'products',
    requiredPermission: 'view_sales'
  },
  {
    id: 'inventory-levels',
    title: 'Inventory Stock Levels',
    description: 'Current stock levels for all products with reorder points and stock value.',
    icon: FaBox,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'low-stock-alerts',
    title: 'Low Stock Alerts',
    description: 'Products that are below minimum stock levels and require immediate attention.',
    icon: FaExclamationTriangle,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'product-performance',
    title: 'Product Performance Analysis',
    description: 'Comprehensive analysis of product profitability, margins, and performance metrics.',
    icon: FaChartBar,
    category: 'products',
    requiredPermission: 'view_analytics'
  },
  {
    id: 'inventory-turnover',
    title: 'Inventory Turnover Report',
    description: 'Analysis of how quickly inventory is sold and replaced over a period.',
    icon: FaBox,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'supplier-performance',
    title: 'Supplier Performance Report',
    description: 'Performance metrics for suppliers including delivery times and quality.',
    icon: FaUsers,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'product-category-analysis',
    title: 'Product Category Analysis',
    description: 'Sales and performance breakdown by product categories and subcategories.',
    icon: FaFileAlt,
    category: 'products',
    requiredPermission: 'view_analytics'
  },
  {
    id: 'inventory-movement',
    title: 'Inventory Movement Report',
    description: 'Track inventory movements including receipts, issues, and adjustments.',
    icon: FaBox,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'inventory-aging',
    title: 'Inventory Aging Report',
    description: 'Shows how long products have been in stock (age buckets: 0-30, 31-60, 61-90, 90+ days). Helps identify slow-moving or obsolete inventory.',
    icon: FaBox,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'stockout-lost-sales',
    title: 'Stockout & Lost Sales Report',
    description: 'Shows products that went out of stock and estimates potential lost sales.',
    icon: FaBox,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  },
  {
    id: 'inventory-valuation',
    title: 'Inventory Valuation Report',
    description: 'Calculates total inventory value by cost and by retail price.',
    icon: FaChartBar,
    category: 'inventory',
    requiredPermission: 'view_inventory'
  }
];

export default function ProductReportsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'products' | 'inventory'>('all');

  const filteredReports = reports.filter(report => {
    if (selectedCategory === 'all') return true;
    return report.category === selectedCategory;
  }).filter(report => {
    if (!user) return false;
    return hasPermission(user, report.requiredPermission);
  });

  const handleGenerateReport = (reportId: string) => {
    router.push(`/products/reports/${reportId}`);
  };

  const handleExportPDF = (reportId: string) => {
    // Placeholder for PDF export
    console.log(`Exporting ${reportId} to PDF`);
    alert(`PDF export for "${reportId}" will be available after backend implementation.`);
  };

  const handleExportExcel = (reportId: string) => {
    // Placeholder for Excel export
    console.log(`Exporting ${reportId} to Excel`);
    alert(`Excel export for "${reportId}" will be available after backend implementation.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Products & Inventory Reports</h1>
          <p className="mt-2 text-lg text-gray-600">
            Generate comprehensive reports for your products and inventory management.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => setSelectedCategory('products')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setSelectedCategory('inventory')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'inventory'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Inventory
            </button>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        report.category === 'products'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {report.category === 'products' ? 'Products' : 'Inventory'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  {report.description}
                </p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaDownload className="w-4 h-4" />
                    <span>Generate</span>
                  </button>
                  <button
                    onClick={() => handleExportPDF(report.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Export as PDF"
                  >
                    <FaFilePdf className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExportExcel(report.id)}
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    title="Export as Excel"
                  >
                    <FaFileExcel className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
            <p className="text-gray-600">
              You don&apos;t have permission to view reports in this category, or no reports match your filter.
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <FaFileAlt className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Report Generation</h4>
              <p className="text-sm text-blue-700">
                Reports are generated in real-time based on your current data. For large datasets,
                generation may take a few moments. All reports include export options for PDF and Excel formats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
