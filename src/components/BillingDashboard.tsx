"use client";
import { useState, useEffect } from 'react';
import { useBilling } from '@/hooks/useBilling';
import BillingPlans, { BillingPlan } from './BillingPlans';
import PaymentMethodForm from './PaymentMethodForm';
import { apiGet } from '@/utils/api';
import { FaChartLine, FaCreditCard, FaReceipt, FaDownload, FaCalendar, FaDollarSign, FaUsers, FaExclamationTriangle } from 'react-icons/fa';

interface PaymentAnalytics {
  period: string;
  totalRevenue: number;
  paymentCount: number;
  averagePayment: number;
  paymentMethods: Array<{
    paymentMethod: string;
    _count: { paymentMethod: number };
    _sum: { amount: number };
  }>;
  currency: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  type: 'payment' | 'invoice';
}

interface BillingDashboardProps {
  tenantId: string;
}

export default function BillingDashboard({ tenantId }: BillingDashboardProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'methods' | 'plans'>('overview');
  const { billingData, loading, error, fetchBillingData, createCheckoutSession } = useBilling();
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [history, setHistory] = useState<PaymentHistory[]>([]);

  useEffect(() => {
    fetchBillingData();
    // Fetch subscription history from backend API
    apiGet('/subscriptions/history').then((data) => {
      if (Array.isArray(data)) {
        setHistory(data);
      }
    });
  }, [period, tenantId]);

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
      case 'canceled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Helper to map backend plans to BillingPlan type
  const mapPlans = (plans: any[], currentPlanId?: string): BillingPlan[] => {
    if (!plans) return [];
    return plans.map((plan: any) => ({
      id: plan.stripePriceId || plan.id || plan.name, // Use stripePriceId for upgrade actions
      name: plan.name,
      price: plan.price,
      currency: plan.currency || 'usd',
      features: plan.features || [],
      isCurrent: currentPlanId ? (plan.id === currentPlanId || plan.stripePriceId === currentPlanId) : false,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Billing Dashboard</h2>
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter' | 'year')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FaChartLine },
            { id: 'history', label: 'Payment History', icon: FaReceipt },
            { id: 'methods', label: 'Payment Methods', icon: FaCreditCard },
            { id: 'plans', label: 'Plans', icon: FaDollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Plans Tab */}
      {selectedTab === 'plans' && billingData?.plans && (
        <BillingPlans
          plans={mapPlans(billingData.plans, billingData.subscription?.planId)}
          currentPlanId={billingData.subscription?.planId}
          onUpgrade={async (stripePriceId) => {
            const url = await createCheckoutSession(stripePriceId);
            if (url) window.location.href = url;
          }}
        />
      )}

      {/* Overview Tab */}
      {selectedTab === 'overview' && analytics && (
        (() => {
          if (!analytics) return null;
          return (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="mb-8">
                {billingData?.subscription && (
                  <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Subscription</h3>
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                      <div>
                        <span className="font-bold">Plan:</span> {billingData.subscription.plan?.name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-bold">Status:</span> {billingData.subscription.status || 'N/A'}
                      </div>
                      <div>
                        <span className="font-bold">Renewal Date:</span> {billingData.subscription.currentPeriodEnd ? formatDate(billingData.subscription.currentPeriodEnd) : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
                {Array.isArray(billingData?.subscription?.history) && billingData.subscription.history.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Subscription History</h3>
                    <ul className="divide-y divide-gray-200">
                      {billingData.subscription.history.map((sub: any) => (
                        <li key={sub.id} className="py-2 flex justify-between items-center">
                          <span>{sub.plan?.name || 'N/A'}</span>
                          <span>{sub.status}</span>
                          <span>{sub.currentPeriodStart ? formatDate(sub.currentPeriodStart) : 'N/A'} - {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : 'N/A'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Total Revenue</h3>
                  <FaDollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(analytics.totalRevenue, analytics.currency)}
                </p>
                <p className="text-sm text-gray-600">This {period}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Payments</h3>
                  <FaCreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.paymentCount}</p>
                <p className="text-sm text-gray-600">Total payments</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Average Payment</h3>
                  <FaChartLine className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(analytics.averagePayment, analytics.currency)}
                </p>
                <p className="text-sm text-gray-600">Per transaction</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Payment Methods</h3>
                  <FaUsers className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.paymentMethods.length}</p>
                <p className="text-sm text-gray-600">Different methods</p>
              </div>

              {/* Payment Methods Distribution */}
              {analytics.paymentMethods.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
                  <div className="space-y-3">
                    {analytics.paymentMethods.map((method, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{method.paymentMethod}</p>
                          <p className="text-sm text-gray-600">{method._count.paymentMethod} payments</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(method._sum.amount, analytics.currency)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {((method._sum.amount / analytics.totalRevenue) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* History Tab */}
      {selectedTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Subscription History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.plan?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sub.currentPeriodStart ? formatDate(sub.currentPeriodStart) : 'N/A'} - {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sub.invoices && sub.invoices.length > 0 ? (
                        <ul className="list-disc ml-4">
                          {sub.invoices.map((inv: any) => (
                            <li key={inv.id}>
                              #{inv.number} - {formatCurrency(inv.amount, 'usd')} ({formatDate(inv.createdAt)})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500">No invoices</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length === 0 && (
            <div className="text-center py-12">
              <FaReceipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your subscription history will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Methods Tab */}
      {selectedTab === 'methods' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Payment Methods</h3>
          </div>
          <div className="max-w-md mx-auto">
            {/* Stripe Elements Card Form */}
            <p className="mb-4 text-gray-600 text-sm">Save your card to enable subscriptions and faster payments.</p>
            {/* You must wrap this in <Elements> higher up in your app for Stripe to work! */}
            <div className="mb-8">
              {/* @ts-ignore-next-line: Stripe context required */}
              <PaymentMethodForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 