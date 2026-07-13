"use client";
import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { FaMobile, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaEye } from 'react-icons/fa';

interface MpesaTransaction {
  id: string;
  phoneNumber: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  checkoutRequestId: string;
  mpesaReceipt?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
  sale?: {
    id: string;
    total: number;
    customerName?: string;
    customerPhone?: string;
    branchId?: string;
    cashierId?: string;
    branchName?: string;
    cashierName?: string;
  };
}
type MpesaTransactionsResponse = {
  success: boolean;
  data: MpesaTransaction[];
  summary?: {
    total: number;
    success: number;
    pending: number;
    failed: number;
    totalAmount: number;
  };
  filters?: {
    branches: Array<{ id: string; name: string }>;
    cashiers: Array<{ id: string; name: string; email?: string }>;
  };
  error?: string;
};

type StatusFilter =
  | 'all'
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'stock_unavailable';

export default function MpesaTransactionsPage() {
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<MpesaTransaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });
  const [isReconciling, setIsReconciling] = useState(false);
  const [branchFilter, setBranchFilter] = useState('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [availableBranches, setAvailableBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [availableCashiers, setAvailableCashiers] = useState<Array<{ id: string; name: string; email?: string }>>([]);

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, branchFilter, cashierFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const branchQuery = branchFilter !== 'all' ? `&branchId=${encodeURIComponent(branchFilter)}` : '';
      const cashierQuery = cashierFilter !== 'all' ? `&cashierId=${encodeURIComponent(cashierFilter)}` : '';
      const response = (await apiGet(
        `/mpesa/tenant/transactions?limit=300${statusQuery}${branchQuery}${cashierQuery}`,
      )) as MpesaTransactionsResponse;
      if (response && response.success) {
        setTransactions(response.data || []);
        setAvailableBranches(response.filters?.branches || []);
        setAvailableCashiers(response.filters?.cashiers || []);
        setSummary(
          response.summary || {
            total: response.data?.length || 0,
            success: response.data?.filter((item) => item.status === 'success').length || 0,
            pending: response.data?.filter((item) => item.status === 'pending').length || 0,
            failed:
              response.data?.filter((item) =>
                ['failed', 'cancelled', 'timeout', 'stock_unavailable'].includes(
                  item.status,
                ),
              ).length || 0,
            totalAmount:
              response.data?.reduce((sum, item) => sum + item.amount, 0) || 0,
          },
        );
      } else {
        setError(response?.error || 'Failed to load transactions');
      }
    } catch {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const reconcileAndRefresh = async () => {
    try {
      setIsReconciling(true);
      setError(null);
      await apiPost('/mpesa/tenant/transactions/reconcile-pending', {});
    } catch {
      // Continue with refresh even if reconcile fails for resilience.
    } finally {
      setIsReconciling(false);
      await fetchTransactions();
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      transaction.phoneNumber.toLowerCase().includes(q) ||
      transaction.checkoutRequestId.toLowerCase().includes(q) ||
      (transaction.mpesaReceipt || '').toLowerCase().includes(q)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
      case 'cancelled':
      case 'timeout':
      case 'stock_unavailable':
        return <FaTimesCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <FaClock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FaExclamationTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
      case 'cancelled':
      case 'timeout':
      case 'stock_unavailable':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('254')) {
      return '0' + phone.substring(3);
    }
    return phone;
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading M-Pesa transactions...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">M-Pesa Transactions</h1>
              <p className="text-gray-600">Track all M-Pesa payment transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTransactions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Refresh
              </button>
              <button
                onClick={reconcileAndRefresh}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-60"
                disabled={isReconciling || loading}
              >
                {isReconciling ? 'Reconciling...' : 'Reconcile Pending'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Success</p>
            <p className="text-lg font-semibold text-green-700">{summary.success}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-semibold text-yellow-700">{summary.pending}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Failed</p>
            <p className="text-lg font-semibold text-red-700">{summary.failed}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Amount</p>
            <p className="text-lg font-semibold text-gray-900">KES {summary.totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by receipt, reference, or phone"
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="timeout">Timeout</option>
            <option value="stock_unavailable">Stock unavailable</option>
          </select>
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All branches</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            value={cashierFilter}
            onChange={(event) => setCashierFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All cashiers</option>
            {availableCashiers.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.name}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FaTimesCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaMobile className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No M-Pesa transactions found for the current filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt / Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.mpesaReceipt ? `Receipt: ${transaction.mpesaReceipt}` : transaction.checkoutRequestId}
                        </div>
                        {transaction.mpesaReceipt && (
                          <div className="text-xs text-gray-500">
                            Ref: {transaction.checkoutRequestId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatPhoneNumber(transaction.phoneNumber)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          KES {transaction.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                        {transaction.message && (
                          <div className="text-xs text-gray-500 mt-1">
                            {transaction.message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(transaction.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Transaction Details</h3>
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Receipt</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.mpesaReceipt || 'Not yet available'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Checkout Request ID</label>
                  <p className="text-sm text-gray-900 break-all">{selectedTransaction.checkoutRequestId}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <p className="text-sm text-gray-900">{formatPhoneNumber(selectedTransaction.phoneNumber)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-sm text-gray-900">KES {selectedTransaction.amount.toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedTransaction.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>
                
                {selectedTransaction.message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <p className="text-sm text-gray-900">{selectedTransaction.message}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Updated</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransaction.updatedAt)}</p>
                </div>
                
                {selectedTransaction.sale && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Sale Details</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Sale ID</label>
                        <p className="text-sm text-gray-900">{selectedTransaction.sale.id}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Total</label>
                        <p className="text-sm text-gray-900">KES {selectedTransaction.sale.total.toFixed(2)}</p>
                      </div>
                      {selectedTransaction.sale.customerName && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Customer</label>
                          <p className="text-sm text-gray-900">{selectedTransaction.sale.customerName}</p>
                        </div>
                      )}
                      {selectedTransaction.sale.branchName && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Branch</label>
                          <p className="text-sm text-gray-900">{selectedTransaction.sale.branchName}</p>
                        </div>
                      )}
                      {selectedTransaction.sale.cashierName && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Cashier</label>
                          <p className="text-sm text-gray-900">{selectedTransaction.sale.cashierName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 