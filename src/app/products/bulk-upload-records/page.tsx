"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FaEye, FaArrowLeft, FaCalendarAlt, FaUser, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaBox, FaStore } from 'react-icons/fa';
import { apiGet } from '@/utils/api';
import { useBranch } from "@/contexts/BranchContext";
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

const BulkUploadRecordsPage: React.FC = () => {
  const { user } = useUser();
  const { selectedBranchId } = useBranch();
  const [records, setRecords] = useState<BulkUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission checks
  const canViewProducts = hasPermission(user, 'view_products');

  const loadBulkUploadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const headers = selectedBranchId ? { 'x-branch-id': selectedBranchId } : undefined;
      const data = await apiGet<BulkUploadRecord[]>('/bulk-upload-records', headers);
      setRecords(data);
    } catch (error) {
      console.error('Failed to load bulk upload records:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadBulkUploadRecords();
  }, [loadBulkUploadRecords]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <FaTimesCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <FaClock className="w-5 h-5 text-yellow-500" />;
      default:
        return <FaExclamationTriangle className="w-5 h-5 text-gray-500" />;
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Records</h1>
              <p className="text-gray-600">View history of bulk product uploads</p>
            </div>
          </div>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bulk upload records...</p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12">
              <FaBox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Bulk Upload Records</h2>
              <p className="text-gray-600 mb-6">You haven&apos;t performed any bulk product uploads yet.</p>
              <Link
                href="/products/bulk-add"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FaBox className="w-4 h-4" />
                Start Bulk Upload
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Upload Date</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">File Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Products</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Success/Failed</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Branch</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Uploaded By</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                          {formatDate(record.uploadDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {record.fileName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {record.totalProducts}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-medium">{record.successfulUploads}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600 font-medium">{record.failedUploads}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaStore className="w-4 h-4 text-gray-400" />
                          {record.branch?.name || 'All Branches'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaUser className="w-4 h-4 text-gray-400" />
                          {record.user?.name || record.createdBy}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/products/bulk-upload-records/${record.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                        >
                          <FaEye className="w-4 h-4" />
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default BulkUploadRecordsPage;
