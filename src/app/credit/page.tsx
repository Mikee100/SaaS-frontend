"use client";
import React, { useState, useEffect, useMemo } from "react";
import { apiGet, apiPost } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaCreditCard, FaMoneyBillWave, FaCalendarAlt, FaUser, FaPhone, FaExclamationTriangle, FaCheckCircle, FaClock, FaPlus, FaEye, FaDollarSign, FaTimesCircle, FaUsers, FaFilePdf, FaFileExcel, FaBuilding } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Spinner from '@/components/Spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface Credit {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  balance: number;
  paidAmount: number;
  dueDate: string | null;
  status: 'active' | 'paid' | 'overdue';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sale: {
    id: string;
    total: number;
    createdAt: string;
    SaleItem: Array<{
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
      };
    }>;
    Branch?: {
      id: string;
      name: string;
      address: string | null;
    };
  };
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    notes: string | null;
    createdAt: string;
  }>;
}

interface CreditScore {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: {
    totalCredits: number;
    paidCredits: number;
    overdueCredits: number;
    averagePaymentDays: number;
    totalCreditAmount: number;
  };
}

interface CreditEligibility {
  isEligible: boolean;
  availableCredit: number;
  requestedAmount: number;
  currentOutstanding: number;
  creditScore: number;
  riskLevel: string;
  reasons: string[];
}


// Remove unused Tenant interface
// interface Tenant {
//   name?: string;
//   pdfTemplate?: PDFTemplate;
// }

// Define a type for customer history to avoid 'unknown' assignment error
type CustomerHistory = {
  summary: {
    totalCredits: number;
    totalCreditAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    paymentRatio: number;
    paidCredits: number;
    // Add other summary fields as needed
  };
  creditHistory: Array<{
    id: string;
    status: string;
    createdAt: string;
    totalAmount: number;
    sale?: {
      items: Array<{ productName: string; quantity: number; price: number }>;
      total: number;
    };
    payments: Array<{ id: string; amount: number; paymentMethod: string; notes?: string; createdAt: string }>;
    balance: number;
    dueDate?: string;
  }>;
};

export default function CreditManagementPage() {
  const { user } = useUser();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreditScoreModal, setShowCreditScoreModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{name: string, phone?: string} | null>(null);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [eligibility, setEligibility] = useState<CreditEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  // Dashboard states
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'reports' | 'completed'>('overview');
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [loadingCustomerHistory, setLoadingCustomerHistory] = useState(false);



  // Permission checks
  const canViewSales = hasPermission(user, 'view_sales');
  const canCreateSales = hasPermission(user, 'create_sales');

  useEffect(() => {
    fetchCredits();
  }, []);

  // Compute aging analysis
  const agingAnalysis = useMemo(() => {
    const now = new Date();
    const aging = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    credits.filter(credit => credit.balance > 0 && credit.status !== 'paid').forEach(credit => {
      if (!credit.dueDate) {
        aging.current += credit.balance;
        return;
      }
      const dueDate = new Date(credit.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) {
        aging.current += credit.balance;
      } else if (daysOverdue <= 30) {
        aging['1-30'] += credit.balance;
      } else if (daysOverdue <= 60) {
        aging['31-60'] += credit.balance;
      } else if (daysOverdue <= 90) {
        aging['61-90'] += credit.balance;
      } else {
        aging['90+'] += credit.balance;
      }
    });
    return aging;
  }, [credits]);

  // Compute payment trends
  const paymentTrends = useMemo(() => {
    const trends: { [key: string]: number } = {};
    credits.forEach(credit => {
      credit.payments.forEach(payment => {
        const month = new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        trends[month] = (trends[month] || 0) + payment.amount;
      });
    });
    return Object.entries(trends).map(([month, amount]) => ({ month, amount })).sort((a, b) => new Date(a.month + ' 1').getTime() - new Date(b.month + ' 1').getTime());
  }, [credits]);

  // Compute credits by customer (all customers)
  const creditsByCustomer = useMemo(() => {
    const customerMap: { [key: string]: { name: string; total: number } } = {};
    credits.forEach(credit => {
      const key = credit.customerName;
      if (!customerMap[key]) {
        customerMap[key] = { name: key, total: 0 };
      }
      customerMap[key].total += credit.totalAmount;
    });
    return Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .map(customer => ({ name: customer.name, total: customer.total }));
  }, [credits]);

  // Compute credits by branch (placeholder - branch data not available in current structure)
  const creditsByBranch = useMemo(() => {
    // Since branch info is not available in the current data structure,
    // we'll show a single entry for all credits
    return [{ name: 'All Branches', total: credits.reduce((sum, credit) => sum + credit.totalAmount, 0), count: credits.length }];
  }, [credits]);

  // Compute credit creation trends by month
  const creditCreationTrends = useMemo(() => {
    const trends: { [key: string]: number } = {};
    credits.forEach(credit => {
      const month = new Date(credit.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      trends[month] = (trends[month] || 0) + 1; // Count of credits created
    });
    return Object.entries(trends).map(([month, count]) => ({ month, count })).sort((a, b) => new Date(a.month + ' 1').getTime() - new Date(b.month + ' 1').getTime());
  }, [credits]);

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Credit Report', 20, 20);

    // Add aging analysis
    doc.text('Aging Analysis:', 20, 40);
    let y = 50;
    Object.entries(agingAnalysis).forEach(([key, value]) => {
      doc.text(`${key}: $${(value as number).toFixed(2)}`, 20, y);
      y += 10;
    });

    // Add credits summary
    y += 20;
    doc.text('Credit Summary:', 20, y);
    y += 10;
    doc.text(`Total Credits: ${credits.length}`, 20, y);
    y += 10;
    doc.text(`Outstanding: $${credits.reduce((sum, credit) => sum + credit.balance, 0).toFixed(2)}`, 20, y);
    y += 10;
    doc.text(`Paid Credits: ${credits.filter(credit => credit.status === 'paid').length}`, 20, y);
    y += 10;
    doc.text(`Overdue: ${credits.filter(credit => credit.status === 'overdue').length}`, 20, y);

    doc.save('credit-report.pdf');
  };

  const exportToExcel = () => {
    const data = credits.map(credit => ({
      Customer: credit.customerName,
      Phone: credit.customerPhone,
      Total: credit.totalAmount,
      Paid: credit.paidAmount,
      Balance: credit.balance,
      Status: credit.status,
      DueDate: credit.dueDate ? new Date(credit.dueDate).toLocaleDateString() : '',
      Notes: credit.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credits');
    XLSX.writeFile(wb, 'credit-report.xlsx');
  };

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/sales/credits/all');
      setCredits(data as Credit[]);
    } catch (error) {
      console.error('Error fetching credits:', error);
      setError('Failed to load credit records');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    if (!selectedCredit || paymentAmount <= 0) return;

    // Use Number() for robust comparison
    if (Math.round(Number(paymentAmount) * 100) > Math.round(Number(selectedCredit.balance) * 100)) {
      setError('Payment amount cannot exceed remaining balance');
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      await apiPost(`/sales/credits/${selectedCredit.id}/payment`, {
        amount: paymentAmount,
        paymentMethod,
        notes: paymentNotes || undefined,
      });

      // Refresh credits data
      await fetchCredits();

      // Close modal and reset form
      setShowPaymentModal(false);
      setSelectedCredit(null);
      setPaymentAmount(0);
      setPaymentMethod('cash');
      setPaymentNotes('');
    } catch (error: unknown) {
      // Try to extract backend error message
      let msg = 'Failed to process payment';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { message?: string } }).response &&
        'message' in (error as { response: { message?: string } }).response
      ) {
        msg = ((error as { response: { message?: string } }).response.message) || msg;
      } else if (error instanceof Error && error.message) {
        msg = error.message;
      }
      setError(msg);
      console.error('Error making payment:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleViewCreditScore = async (customerName: string, customerPhone?: string) => {
    setSelectedCustomer({ name: customerName, phone: customerPhone });
    setLoadingScore(true);
    setShowCreditScoreModal(true);

    try {
      const score = await apiGet(`/sales/credits/score?customerName=${encodeURIComponent(customerName)}${customerPhone ? `&customerPhone=${encodeURIComponent(customerPhone)}` : ''}`);
      setCreditScore(score as CreditScore);
    } catch (error) {
      console.error('Error fetching credit score:', error);
      setError('Failed to load credit score');
    } finally {
      setLoadingScore(false);
    }
  };

  const handleCheckEligibility = async () => {
    if (!selectedCustomer || requestedAmount <= 0) return;

    setLoadingEligibility(true);
    setEligibility(null);

    try {
      const result = await apiPost('/sales/credits/eligibility', {
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        requestedAmount,
      });
      setEligibility(result as CreditEligibility);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setError('Failed to check credit eligibility');
    } finally {
      setLoadingEligibility(false);
    }
  };

  const fetchCustomerHistory = async () => {
    if (!selectedCustomer?.name) return;

    setLoadingCustomerHistory(true);
    setCustomerHistory(null);

    try {
      const result = await apiGet(`/sales/credits/customer-history?customerName=${encodeURIComponent(selectedCustomer.name)}${selectedCustomer.phone ? `&customerPhone=${encodeURIComponent(selectedCustomer.phone)}` : ''}`);
      setCustomerHistory(result as CustomerHistory);
    } catch (error) {
      console.error('Error fetching customer history:', error);
      setError('Failed to load customer history');
    } finally {
      setLoadingCustomerHistory(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <FaCheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <FaExclamationTriangle className="w-4 h-4" />;
      default:
        return <FaClock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!canViewSales) {
    return (
      <AuthGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view credit records.</p>
            <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Credit Management</h1>
          <p className="text-xs text-gray-500">Manage customer credit accounts and payments</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Completed
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {error && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                <FaExclamationTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaCreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Total Credits</div>
                  <div className="text-base font-bold text-gray-900">{credits.length}</div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaDollarSign className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="text-xs text-gray-500">Outstanding</div>
                  <div className="text-base font-bold text-gray-900">
                    ${credits.reduce((sum, credit) => sum + credit.balance, 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Paid Credits</div>
                  <div className="text-base font-bold text-gray-900">
                    {credits.filter(credit => credit.status === 'paid').length}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-xs text-gray-500">Overdue</div>
                  <div className="text-base font-bold text-gray-900">
                    {credits.filter(credit => credit.status === 'overdue').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Credits List */}
            <div className="bg-white rounded shadow-sm border border-gray-100">
              <div className="p-3 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Credit Records</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {credits.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FaCreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-medium">No credit records found</p>
                    <p className="text-xs">Credit sales will appear here</p>
                  </div>
                ) : (
                  credits.map((credit) => (
                    <div key={credit.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900">{credit.customerName}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(credit.status)}`}>
                              {getStatusIcon(credit.status)}
                              {credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <FaPhone className="w-3 h-3" />
                              <span>{credit.customerPhone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaDollarSign className="w-3 h-3" />
                              <span>Balance: ${credit.balance.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>Due: {credit.dueDate ? new Date(credit.dueDate).toLocaleDateString() : 'No due date'}</span>
                            </div>
                          </div>
                          {credit.notes && (
                            <p className="text-xs text-gray-500 mt-1">{credit.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCredit(credit)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FaEye className="w-3 h-3 inline mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleViewCreditScore(credit.customerName, credit.customerPhone)}
                            className="px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                          >
                            <FaCreditCard className="w-3 h-3 inline mr-1" />
                            Score
                          </button>
                          {credit.balance > 0 && canCreateSales && (
                            <button
                              onClick={() => {
                                setSelectedCredit(credit);
                                setShowPaymentModal(true);
                                setPaymentAmount(0);
                              }}
                              className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            >
                              <FaPlus className="w-3 h-3 inline mr-1" />
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Customer Search */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Analytics</h2>
              {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                  <FaExclamationTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={selectedCustomer?.name || ''}
                    onChange={(e) => setSelectedCustomer({ name: e.target.value.trim(), phone: selectedCustomer?.phone })}
                    className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={selectedCustomer?.phone || ''}
                    onChange={(e) => setSelectedCustomer({ name: selectedCustomer?.name || '', phone: e.target.value.trim() })}
                    className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <button
                onClick={fetchCustomerHistory}
                disabled={loadingCustomerHistory || !selectedCustomer?.name}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingCustomerHistory ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <FaUsers className="w-3 h-3" />
                    View Analytics
                  </>
                )}
              </button>
            </div>

            {/* Customer Analytics Display */}
            {customerHistory && (
              <>
                {/* Customer Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                    <FaCreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Total Credits</div>
                      <div className="text-base font-bold text-gray-900">{(customerHistory as { summary: { totalCredits: number } }).summary.totalCredits}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                    <FaDollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-xs text-gray-500">Total Credit Amount</div>
                      <div className="text-base font-bold text-gray-900">${(customerHistory as { summary: { totalCreditAmount: number } }).summary.totalCreditAmount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                    <FaMoneyBillWave className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-xs text-gray-500">Total Paid</div>
                      <div className="text-base font-bold text-gray-900">${(customerHistory as { summary: { totalPaid: number } }).summary.totalPaid.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                    <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-xs text-gray-500">Outstanding</div>
                      <div className="text-base font-bold text-gray-900">${(customerHistory as { summary: { totalOutstanding: number } }).summary.totalOutstanding.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Payment Ratio Chart */}
                <div className="bg-white rounded shadow-sm border border-gray-100 p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Performance</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div
                          className="bg-green-500 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${(customerHistory as { summary: { paymentRatio: number } }).summary.paymentRatio}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Payment Ratio: {(customerHistory as { summary: { paymentRatio: number } }).summary.paymentRatio.toFixed(1)}%</span>
                        <span>{(customerHistory as { summary: { paidCredits: number, totalCredits: number } }).summary.paidCredits} of {(customerHistory as { summary: { totalCredits: number } }).summary.totalCredits} credits paid</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit History Timeline */}
                <div className="bg-white rounded shadow-sm border border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Credit History</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Array.isArray((customerHistory as { creditHistory: unknown[] }).creditHistory) && (customerHistory as { creditHistory: unknown[] }).creditHistory.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <FaCreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No credit history found for this customer</p>
                      </div>
                    ) : (
                      Array.isArray((customerHistory as { creditHistory: unknown[] }).creditHistory) &&
                      (customerHistory as { creditHistory: unknown[] }).creditHistory.map((credit) => {
                        const c = credit as {
                          id: string;
                          status: string;
                          createdAt: string;
                          totalAmount: number;
                          sale?: {
                            items: Array<{ productName: string; quantity: number; price: number }>;
                            total: number;
                          };
                          payments: Array<{ id: string; amount: number; paymentMethod: string; notes?: string; createdAt: string }>;
                          balance: number;
                          dueDate?: string;
                        };
                        return (
                          <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${c.status === 'paid' ? 'bg-green-500' : c.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">
                                    Credit #{c.id.slice(-8)}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  ${c.totalAmount.toFixed(2)}
                                </div>
                                <div className={`text-xs ${c.status === 'paid' ? 'text-green-600' : c.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}>
                                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                </div>
                              </div>
                            </div>

                            {/* Sale Items */}
                            {c.sale && (
                              <div className="mb-3">
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Items Purchased:</h5>
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="space-y-1">
                                    {c.sale.items.map((item, index) => (
                                      <div key={index} className="flex justify-between text-xs">
                                        <span>{item.productName}</span>
                                        <span>{item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}</span>
                                      </div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-1 mt-2 flex justify-between font-medium">
                                      <span>Total:</span>
                                      <span>${c.sale.total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Payment History */}
                            {c.payments.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Payment History:</h5>
                                <div className="space-y-1">
                                  {c.payments.map((payment) => (
                                    <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                                      <div>
                                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                                        <span className="text-gray-500 ml-2">({payment.paymentMethod})</span>
                                        {payment.notes && <p className="text-gray-600 mt-1">{payment.notes}</p>}
                                      </div>
                                      <span className="text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Outstanding Balance */}
                            {c.balance > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">Outstanding Balance:</span>
                                  <span className="text-sm font-medium text-red-600">${c.balance.toFixed(2)}</span>
                                </div>
                                {c.dueDate && (
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-600">Due Date:</span>
                                    <span className="text-xs text-gray-900">{new Date(c.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Aging Analysis */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Aging Analysis</h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportToPDF}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <FaFilePdf className="w-3 h-3" />
                    PDF
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <FaFileExcel className="w-3 h-3" />
                    Excel
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium">Current</div>
                  <div className="text-lg font-bold text-blue-900">${agingAnalysis.current.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="text-xs text-yellow-700 font-medium">1-30 Days</div>
                  <div className="text-lg font-bold text-yellow-900">${agingAnalysis['1-30'].toFixed(2)}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <div className="text-xs text-orange-700 font-medium">31-60 Days</div>
                  <div className="text-lg font-bold text-orange-900">${agingAnalysis['31-60'].toFixed(2)}</div>
                </div>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <div className="text-xs text-red-700 font-medium">61-90 Days</div>
                  <div className="text-lg font-bold text-red-900">${agingAnalysis['61-90'].toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-700 font-medium">90+ Days</div>
                  <div className="text-lg font-bold text-gray-900">${agingAnalysis['90+'].toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Payment Trends Chart */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Payment Trends</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paymentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Credits by Customer Chart */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FaUsers className="w-4 h-4" />
                  Credits by Customer
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={creditsByCustomer}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Total Credit']} />
                    <Bar dataKey="total" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Credits by Branch Chart */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FaBuilding className="w-4 h-4" />
                  Credits by Branch
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={creditsByBranch}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                  <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Total Credit']} />
                    <Bar dataKey="total" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Credit Creation Trends Chart */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Credit Creation Trends</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creditCreationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} credits`, 'Count']} />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Summary Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{credits.length}</div>
                  <div className="text-xs text-gray-500">Total Credits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${credits.reduce((sum, credit) => sum + credit.paidAmount, 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Total Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    ${credits.reduce((sum, credit) => sum + credit.balance, 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Outstanding</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {credits.filter(credit => credit.status === 'paid').length}
                  </div>
                  <div className="text-xs text-gray-500">Paid Credits</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <>
            {error && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                <FaExclamationTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary Cards for Completed */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaCreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Completed Credits</div>
                  <div className="text-base font-bold text-gray-900">
                    {credits.filter(credit => credit.status === 'paid').length}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaDollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Total Paid</div>
                  <div className="text-base font-bold text-gray-900">
                    ${credits.filter(credit => credit.status === 'paid').reduce((sum, credit) => sum + credit.paidAmount, 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Fully Paid</div>
                  <div className="text-base font-bold text-gray-900">
                    {credits.filter(credit => credit.status === 'paid' && credit.balance === 0).length}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded shadow-sm p-3 flex items-center gap-2 border border-gray-100">
                <FaCalendarAlt className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-500">Avg Completion Time</div>
                  <div className="text-base font-bold text-gray-900">
                    {(() => {
                      const completedCredits = credits.filter(credit => credit.status === 'paid');
                      if (completedCredits.length === 0) return 'N/A';
                      const totalDays = completedCredits.reduce((sum, credit) => {
                        const created = new Date(credit.createdAt);
                        const updated = new Date(credit.updatedAt);
                        return sum + Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                      }, 0);
                      return Math.floor(totalDays / completedCredits.length) + ' days';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Credits List */}
            <div className="bg-white rounded shadow-sm border border-gray-100">
              <div className="p-3 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Completed Credit Records</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {credits.filter(credit => credit.status === 'paid').length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FaCheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-medium">No completed credits found</p>
                    <p className="text-xs">Completed credits will appear here</p>
                  </div>
                ) : (
                  credits.filter(credit => credit.status === 'paid').map((credit) => (
                    <div key={credit.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900">{credit.customerName}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaCheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <FaPhone className="w-3 h-3" />
                              <span>{credit.customerPhone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaDollarSign className="w-3 h-3" />
                              <span>Total: ${credit.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>Completed: {new Date(credit.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {credit.notes && (
                            <p className="text-xs text-gray-500 mt-1">{credit.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCredit(credit)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FaEye className="w-3 h-3 inline mr-1" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Credit Details Modal */}
        {selectedCredit && !showPaymentModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full max-w-lg mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Credit Details</h3>
                  <button
                    onClick={() => setSelectedCredit(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <FaTimesCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-xs">Customer Info</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <FaUser className="w-3 h-3 text-gray-400" />
                        <span>{selectedCredit.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaPhone className="w-3 h-3 text-gray-400" />
                        <span>{selectedCredit.customerPhone}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-xs">Credit Summary</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">${selectedCredit.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid:</span>
                        <span className="font-medium text-green-600">${selectedCredit.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance:</span>
                        <span className="font-medium text-red-600">${selectedCredit.balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Due:</span>
                        <span>{selectedCredit.dueDate ? new Date(selectedCredit.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Sale Items */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-xs">Sale Items</h4>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="space-y-1 text-xs">
                      {selectedCredit.sale.Branch && (
                        <div className="flex items-center gap-1 text-gray-600 mb-2">
                          <FaBuilding className="w-3 h-3" />
                          <span>Branch: {selectedCredit.sale.Branch.name} {selectedCredit.sale.Branch.address && `(${selectedCredit.sale.Branch.address})`}</span>
                        </div>
                      )}
                      {selectedCredit.sale.SaleItem.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.product.name}</span>
                          <span>{item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-1 mt-2 flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${selectedCredit.sale.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Payment History */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-xs">Payment History</h4>
                  {selectedCredit.payments.length === 0 ? (
                    <p className="text-gray-500 text-xs">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedCredit.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                          <div>
                            <span className="font-medium">${payment.amount.toFixed(2)}</span>
                            <span className="text-gray-500 ml-2">({payment.paymentMethod})</span>
                            {payment.notes && <p className="text-gray-600 mt-1">{payment.notes}</p>}
                          </div>
                          <span className="text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedCredit && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full max-w-sm mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Record Payment</h3>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedCredit(null);
                      setError(null); // Reset error on close
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <FaTimesCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Amount</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(parseFloat(e.target.value) || 0);
                        setError(null); // Reset error on amount change
                      }}
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="0.00"
                      min="0"
                      max={selectedCredit.balance}
                      step="0.01"
                    />
                    <p className="text-xs text-gray-400 mt-1">Max: ${selectedCredit.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="Payment notes..."
                      rows={2}
                    />
                  </div>
                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedCredit(null);
                      setError(null);
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                    disabled={processingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakePayment}
                    disabled={processingPayment || paymentAmount <= 0 || Math.round(paymentAmount * 100) > Math.round(selectedCredit.balance * 100)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {processingPayment ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaMoneyBillWave className="w-3 h-3" />
                        Record
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Credit Line Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full max-w-sm mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-lg p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">Add Credit Line</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <FaTimesCircle className="w-4 h-4" />
                  </button>
                </div>
                <form>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Credit Name</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="Enter credit name"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs">
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Credit Score Modal */}
        {showCreditScoreModal && selectedCustomer && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full max-w-md mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Credit Score</h3>
                  <button
                    onClick={() => {
                      setShowCreditScoreModal(false);
                      setSelectedCustomer(null);
                      setCreditScore(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <FaTimesCircle className="w-4 h-4" />
                  </button>
                </div>
                {loadingScore ? (
                  <div className="flex justify-center items-center py-8">
                    <Spinner />
                  </div>
                ) : creditScore ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{creditScore.score}</div>
                      <div className={`text-sm font-medium ${creditScore.riskLevel === 'low' ? 'text-green-600' : creditScore.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {creditScore.riskLevel.charAt(0).toUpperCase() + creditScore.riskLevel.slice(1)} Risk
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-medium text-gray-700">Total Credits</div>
                        <div className="text-gray-900">{creditScore.factors.totalCredits}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Paid Credits</div>
                        <div className="text-gray-900">{creditScore.factors.paidCredits}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Overdue Credits</div>
                        <div className="text-gray-900">{creditScore.factors.overdueCredits}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Avg Payment Days</div>
                        <div className="text-gray-900">{creditScore.factors.averagePaymentDays}</div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowCreditScoreModal(false);
                          setShowEligibilityModal(true);
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                      >
                        Check Eligibility
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaExclamationTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Failed to load credit score</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Modal */}
        {showEligibilityModal && selectedCustomer && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full max-w-md mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Credit Eligibility</h3>
                  <button
                    onClick={() => {
                      setShowEligibilityModal(false);
                      setSelectedCustomer(null);
                      setEligibility(null);
                      setRequestedAmount(0);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <FaTimesCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Requested Amount</label>
                    <input
                      type="number"
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <button
                    onClick={handleCheckEligibility}
                    disabled={loadingEligibility || requestedAmount <= 0}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingEligibility ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Checking...
                      </>
                    ) : (
                      'Check Eligibility'
                    )}
                  </button>
                  {eligibility && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className={`p-3 rounded text-xs ${eligibility.isEligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {eligibility.isEligible ? (
                            <FaCheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <FaTimesCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`font-medium ${eligibility.isEligible ? 'text-green-800' : 'text-red-800'}`}>
                            {eligibility.isEligible ? 'Eligible' : 'Not Eligible'}
                          </span>
                        </div>
                        <div className="space-y-1 text-gray-700">
                          <div>Available Credit: ${eligibility.availableCredit.toFixed(2)}</div>
                          <div>Current Outstanding: ${eligibility.currentOutstanding.toFixed(2)}</div>
                          <div>Credit Score: {eligibility.creditScore}</div>
                          <div>Risk Level: {eligibility.riskLevel}</div>
                          {eligibility.reasons.length > 0 && (
                            <div>
                              <div className="font-medium">Reasons:</div>
                              <ul className="list-disc list-inside ml-2">
                                {eligibility.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
