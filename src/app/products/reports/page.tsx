"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle, FaBox, FaShoppingCart, FaFilePdf, FaFileExcel, FaTh, FaList } from "react-icons/fa";
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

interface HiddenReportStatus {
  id: string;
  title: string;
  reason: string;
  endpoint: string;
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
  }
];

const hiddenReports: HiddenReportStatus[] = [
  {
    id: 'inventory-turnover',
    title: 'Inventory Turnover',
    reason: 'Uses simulated/random values in frontend.',
    endpoint: 'GET /analytics/inventory-turnover',
  },
  {
    id: 'supplier-performance',
    title: 'Supplier Performance',
    reason: 'Uses hardcoded mock supplier records.',
    endpoint: 'GET /analytics/supplier-performance',
  },
  {
    id: 'product-category-analysis',
    title: 'Product Category Analysis',
    reason: 'No valid report page is currently implemented.',
    endpoint: 'GET /analytics/product-category-analysis',
  },
  {
    id: 'inventory-movement',
    title: 'Inventory Movement',
    reason: 'Uses static fake movement data.',
    endpoint: 'GET /analytics/inventory-movement',
  },
  {
    id: 'inventory-aging',
    title: 'Inventory Aging',
    reason: 'Backend endpoint missing and value assumptions in frontend.',
    endpoint: 'GET /analytics/inventory-aging',
  },
  {
    id: 'stockout-lost-sales',
    title: 'Stockout & Lost Sales',
    reason: 'Frontend expects endpoint that is not implemented.',
    endpoint: 'GET /analytics/stockout-lost-sales',
  },
  {
    id: 'inventory-valuation',
    title: 'Inventory Valuation',
    reason: 'Frontend expects endpoint that is not implemented.',
    endpoint: 'GET /analytics/inventory-valuation',
  },
];

export default function ProductReportsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'products' | 'inventory'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const canViewHiddenReportsStatus = Boolean(
    user &&
      (
        user.isSuperadmin ||
        user.roles?.includes('superadmin') ||
        user.roles?.includes('owner') ||
        user.roles?.includes('admin') ||
        hasPermission(user, 'manage_settings')
      ),
  );

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
    console.log(`Exporting ${reportId} to PDF`);
    alert(`PDF export for "${reportId}" will be available after backend implementation.`);
  };

  const handleExportExcel = (reportId: string) => {
    console.log(`Exporting ${reportId} to Excel`);
    alert(`Excel export for "${reportId}" will be available after backend implementation.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products & Inventory Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate comprehensive reports for your products and inventory management
          </p>
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => setSelectedCategory('products')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setSelectedCategory('inventory')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'inventory'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Inventory
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              title="Grid View"
            >
              <FaTh className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              title="List View"
            >
              <FaList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reports Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map((report) => {
              const Icon = report.icon;
              const categoryColor = report.category === 'products'
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-purple-50 text-purple-700 border-purple-100';

              return (
                <div
                  key={report.id}
                  className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor}`}>
                      {report.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{report.title}</h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{report.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View Report
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportPDF(report.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                        title="Export to PDF"
                      >
                        <FaFilePdf className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportExcel(report.id);
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
                        title="Export to Excel"
                      >
                        <FaFileExcel className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const Icon = report.icon;
              const categoryColor = report.category === 'products'
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-purple-50 text-purple-700 border-purple-100';

              return (
                <div
                  key={report.id}
                  className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-medium text-gray-900">{report.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor} ml-2 flex-shrink-0`}>
                          {report.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{report.description}</p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleGenerateReport(report.id)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View Report
                        </button>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPDF(report.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                            title="Export to PDF"
                          >
                            <FaFilePdf className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportExcel(report.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
                            title="Export to Excel"
                          >
                            <FaFileExcel className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {canViewHiddenReportsStatus && (
            <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-900">Hidden Reports Awaiting Backend</h2>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Internal
                </span>
              </div>
              <p className="mb-3 text-xs text-amber-800">
                These reports are intentionally hidden from normal users until backend endpoints are production-ready.
              </p>
              <div className="overflow-x-auto rounded border border-amber-200 bg-white">
                <table className="min-w-full divide-y divide-amber-100 text-xs">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-amber-900">Report</th>
                      <th className="px-3 py-2 text-left font-semibold text-amber-900">Why Hidden</th>
                      <th className="px-3 py-2 text-left font-semibold text-amber-900">Required Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {hiddenReports.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.title}</td>
                        <td className="px-3 py-2 text-gray-700">{item.reason}</td>
                        <td className="px-3 py-2 text-gray-700">{item.endpoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-amber-800">
                Reference: docs/PRODUCT_INVENTORY_REPORTS_BACKEND_TODO.md
              </p>
            </section>
          )}
        )}

        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FaFileAlt className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filter or check back later for new reports.
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FaFileAlt className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-medium text-blue-900 mb-1">Report Generation</h4>
              <p className="text-xs text-blue-700">
                Reports are generated in real-time based on your current data. All reports include export options.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
