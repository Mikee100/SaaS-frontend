'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/utils/api';
import {
  FaSearch,
  FaFilter,
  FaSync,
  FaEdit,
  FaPlus,
  FaChevronLeft
} from 'react-icons/fa';

interface Tenant {
  id: string;
  tenantId?: string;
  name?: string;
  clientName?: string;
  email?: string;
  clientEmail?: string;
  plan?: {
    name?: string;
    price?: number;
    currency?: string;
  } | string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export default function TenantBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet<Tenant[]>('/billing/admin/billing/tenants');
      
      // Validate the response is an array before setting state
      if (Array.isArray(data)) {
        setTenants(data);
      } else {
        throw new Error('Invalid data format received from server: expected an array of tenants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    // Support both name/email and clientName/clientEmail from backend
    const name = tenant.name || tenant.clientName || '';
    const email = tenant.email || tenant.clientEmail || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    // For KES/Ksh, use custom formatting
    if (currency.toUpperCase() === 'KES' || currency.toUpperCase() === 'KSH') {
      return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-800', label: 'Trialing' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', label: 'Past Due' },
      canceled: { color: 'bg-gray-100 text-gray-800', label: 'Canceled' },
      unpaid: { color: 'bg-red-100 text-red-800', label: 'Unpaid' },
    };

    const { color, label } = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <FaChevronLeft className="mr-1" /> Back to Billing
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Billing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage tenant subscriptions and billing information
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/superadmin/billing/tenants/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <FaPlus className="-ml-1 mr-2 h-4 w-4" />
              Add New Tenant
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <FaFilter className="mr-2 text-gray-400" />
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <button
                onClick={fetchTenants}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Refresh"
              >
                <FaSync className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Billing
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTenants.length > 0 ? (
                paginatedTenants.map((tenant) => (
                  <tr key={tenant.tenantId || tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.clientName || tenant.name || '-'}</div>
                      <div className="text-sm text-gray-500">{tenant.clientEmail || tenant.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {typeof tenant.plan === 'string' ? tenant.plan : tenant.plan?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(tenant.status || '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.currentPeriodEnd ? formatDate(tenant.currentPeriodEnd) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {typeof tenant.plan === 'object' && tenant.plan?.price !== undefined
                        ? formatCurrency(tenant.plan.price, tenant.plan?.currency || 'KES')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/superadmin/billing/tenants/${tenant.tenantId || tenant.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <FaEdit className="inline mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No tenants found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTenants.length > itemsPerPage && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.ceil(filteredTenants.length / itemsPerPage) === p ? p : p + 1)}
                disabled={currentPage === Math.ceil(filteredTenants.length / itemsPerPage)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredTenants.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredTenants.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <FaChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: Math.ceil(filteredTenants.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border ${currentPage === page 
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.ceil(filteredTenants.length / itemsPerPage) === p ? p : p + 1)}
                    disabled={currentPage === Math.ceil(filteredTenants.length / itemsPerPage)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <FaChevronLeft className="h-5 w-5 transform rotate-180" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
