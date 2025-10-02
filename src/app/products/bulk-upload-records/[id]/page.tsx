"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FaArrowLeft, FaCalendarAlt, FaUser, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaBox, FaStore, FaChevronDown, FaChevronUp, FaFileCsv, FaBuilding, FaDownload } from 'react-icons/fa';
import { apiGet, apiPut } from '@/utils/api';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import AuthGuard from '@/components/AuthGuard';

interface BulkUploadRecord {
  id: string;
  uploadDate: string;
  totalProducts: number;
  successfulUploads: number;
  failedUploads: number;
  status: 'processing' | 'completed' | 'failed';
  fileName?: string;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  createdBy: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    stock: number;
  }>;
  errors?: string[];
}

const BulkUploadRecordDetailsPage: React.FC = () => {
  const { user } = useUser();
  const params = useParams();
  const recordId = params?.id as string;

  const [record, setRecord] = useState<BulkUploadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{id: string, name: string}>>([]);

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');
  const canManageProducts = hasPermission(user, 'manage_products');

  const [productsCollapsed, setProductsCollapsed] = useState(true);

  const loadBulkUploadRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<BulkUploadRecord>(`/bulk-upload-records/${recordId}`);
      setRecord(data);
    } catch (error) {
      console.error('Failed to load bulk upload record:', error);
      setError('Failed to load bulk upload record details');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    if (recordId) {
      loadBulkUploadRecord();
    }
  }, [recordId, loadBulkUploadRecord]);

  // Load suppliers for dropdown
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const suppliersData = await apiGet<Array<{id: string, name: string}>>('/suppliers');
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Failed to load suppliers:', error);
      }
    };

    if (canManageProducts) {
      loadSuppliers();
    }
  }, [canManageProducts]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <FaTimesCircle className="w-6 h-6 text-red-500" />;
      case 'processing':
        return <FaClock className="w-6 h-6 text-yellow-500" />;
      default:
        return <FaExclamationTriangle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportProducts = () => {
    if (!record?.products) return;

    // Dynamically get all unique keys from products to support flexible fields
    const allKeys = new Set<string>();
    record.products.forEach(product => {
      Object.keys(product).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    const csvContent = [
      headers,
      ...record.products.map(product =>
        headers.map(header => {
          const value = product[header as keyof typeof product];
          if (typeof value === 'number') {
            return value.toFixed ? value.toFixed(2) : value.toString();
          }
          return value !== undefined && value !== null ? value.toString() : '';
        })
      )
    ];

    const csvString = csvContent.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-upload-products-${record.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!canViewProducts) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view products.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/products/bulk-upload-records"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <FaArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bulk upload record details...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !record) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/products/bulk-upload-records"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <FaArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Record Details</h1>
                <p className="text-gray-600">View detailed information about a bulk product upload</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12">
              <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Record</h2>
              <p className="text-gray-600 mb-6">{error || 'Record not found'}</p>
              <Link
                href="/products/bulk-upload-records"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FaArrowLeft className="w-4 h-4" />
                Back to Records
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products/bulk-upload-records"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Details</h1>
              <p className="text-gray-600">Detailed information about bulk product upload #{record.id.slice(-8)}</p>
            </div>
          </div>

          <div className="flex gap-4">
          {record.products && record.products.length > 0 && (
            <button
              onClick={exportProducts}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FaDownload className="w-4 h-4" />
              Export Products
            </button>
          )}
          <button
            onClick={async () => {
              try {
                // Use the products from the current bulk upload record as sample data
                const sampleProduct = record?.products && record.products.length > 0 ? record.products[0] : null;

                const csvHeaders = [
                  'name (required)',
                  'sku (required)',
                  'price (required, decimal)',
                  'cost (optional, decimal)',
                  'stock (optional, integer)',
                  'description (optional)',
                  'supplierId (optional)'
                ];

                const csvSampleRow = sampleProduct ? [
                  sampleProduct.name || 'Sample Product',
                  sampleProduct.sku || 'SKU001',
                  sampleProduct.price ? sampleProduct.price.toString() : '19.99',
                  sampleProduct.cost ? sampleProduct.cost.toString() : '10.00',
                  sampleProduct.stock ? sampleProduct.stock.toString() : '100',
                  '', // description not available in product object here
                  ''  // supplierId not available in product object here
                ] : [
                  'Sample Product',
                  'SKU001',
                  '19.99',
                  '10.00',
                  '100',
                  'This is a sample product description',
                  ''
                ];

                const csvContent = [csvHeaders, csvSampleRow];
                const csvString = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'bulk-upload-template.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (error) {
                console.error('Failed to generate CSV template:', error);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FaFileCsv className="w-4 h-4" />
            Download CSV Template
          </button>
{canManageProducts && record.products && record.products.length > 0 && (
  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
    <label htmlFor="supplierSelect" className="sr-only">Select Supplier</label>
    <select
      id="supplierSelect"
      className="bg-purple-600 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
      onChange={async (e) => {
        const supplierId = e.target.value;
        if (supplierId) {
          try {
            await apiPut(`/bulk-upload-records/${recordId}/assign-supplier`, { supplierId });
            loadBulkUploadRecord();
          } catch (error) {
            console.error('Failed to assign supplier:', error);
            alert('Failed to assign supplier to products');
          }
        }
      }}
      defaultValue=""
    >
      <option value="" disabled>Select Supplier</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name}
        </option>
      ))}
    </select>
  </div>
)}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(record.status)}
              <span className="font-medium text-gray-900">Status</span>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(record.status)}`}>
              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaBox className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Total Products</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{record.totalProducts}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaCheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Successful</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{record.successfulUploads}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaTimesCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-900">Failed</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{record.failedUploads}</span>
          </div>
        </div>

        {/* Upload Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Upload Date:</span>
                <div className="flex items-center gap-2 text-gray-900">
                  <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                  {formatDate(record.uploadDate)}
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">File Name:</span>
                <span className="text-gray-900 font-medium">{record.fileName || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Branch:</span>
                <div className="flex items-center gap-2 text-gray-900">
                  <FaStore className="w-4 h-4 text-gray-400" />
                  {record.branch?.name || 'All Branches'}
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Supplier:</span>
                <div className="flex items-center gap-2 text-gray-900">
                  <FaBuilding className="w-4 h-4 text-gray-400" />
                  {record.supplier?.name || 'Not Assigned'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Uploaded By:</span>
                <div className="flex items-center gap-2 text-gray-900">
                  <FaUser className="w-4 h-4 text-gray-400" />
                  {record.user?.name || record.createdBy}
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Success Rate:</span>
                <span className="text-gray-900 font-medium">
                  {record.totalProducts > 0
                    ? `${((record.successfulUploads / record.totalProducts) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Errors Section */}
        {record.errors && record.errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Errors</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-2">
                {record.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <FaTimesCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Products List */}
        {record.products && record.products.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div
            className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer select-none"
            onClick={() => setProductsCollapsed(!productsCollapsed)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setProductsCollapsed(!productsCollapsed);
              }
            }}
            aria-expanded={!productsCollapsed}
            aria-controls="products-table"
          >
            <h2 className="text-xl font-semibold text-gray-900">Products Created ({record.products.length})</h2>
            {productsCollapsed ? (
              <FaChevronDown className="w-6 h-6 text-gray-600" />
            ) : (
              <FaChevronUp className="w-6 h-6 text-gray-600" />
            )}
          </div>

          {!productsCollapsed && (
            <div className="overflow-x-auto" id="products-table">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Product Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">SKU</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Price</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Cost</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {record.products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{product.sku}</td>
                      <td className="px-6 py-4 text-gray-600">${product.price ? product.price.toFixed(2) : '0.00'}</td>
                      <td className="px-6 py-4 text-gray-600">${product.cost ? product.cost.toFixed(2) : '0.00'}</td>
                      <td className="px-6 py-4 text-gray-600">{product.stock || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* No Products Message */}
      {(!record.products || record.products.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <FaBox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Created</h3>
            <p className="text-gray-600">This bulk upload didn&apos;t create any products successfully.</p>
          </div>
        </div>
      )}
    </div>
  </AuthGuard>
);
};

export default BulkUploadRecordDetailsPage;
