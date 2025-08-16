"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import { FaCrown, FaStar, FaCheck, FaTimes, FaCreditCard, FaDownload, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { Suspense } from "react";
import dynamic from "next/dynamic";

const SubscriptionPage = dynamic(() => import("./subscription/page"), { ssr: false });
const InvoicesPage = dynamic(() => import("./invoices/page"), { ssr: false });
interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  maxUsers: number;
  maxProducts: number;
  maxSalesPerMonth: number;
  analyticsEnabled: boolean;
  advancedReports: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

interface Subscription {
  id: string;
  status: string;
  plan: Plan;
  startDate: string;
  endDate: string;
  cancelledAt?: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function BillingSettings() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plansData, subscriptionData] = await Promise.all([
          apiGet('/billing/plans') as Promise<Plan[]>,
          apiGet('/billing') as Promise<Subscription>,
          // apiGet('/billing/invoices') as Promise<Invoice[]>, // Temporarily commented out
        ]);
        
        setPlans(plansData);
        setCurrentSubscription(subscriptionData);
        setInvoices([]); // Set empty array for now
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    try {
      setUpgrading(true);
      await apiPost('/billing/subscribe', { planId: plan.id });
      
      // Refresh data
      const subscriptionData = await apiGet('/billing') as Subscription;
      setCurrentSubscription(subscriptionData);
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to downgrade to ${plan.name}? This will take effect at the end of your current billing cycle.`)) {
      return;
    }

    try {
      setUpgrading(true);
      await apiPut('/billing/subscription', { planId: plan.id });
      alert('Downgrade scheduled successfully. Your plan will change at the end of your current billing cycle.');
    } catch (error) {
      console.error('Error downgrading plan:', error);
      alert('Failed to schedule downgrade. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return;
    }

    try {
      await apiDelete('/billing/subscription');
      alert('Subscription cancelled successfully.');
      // Refresh data
      const subscriptionData = await apiGet('/billing') as Subscription;
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Basic':
        return <FaStar className="w-6 h-6 text-blue-600" />;
      case 'Pro':
        return <FaStar className="w-6 h-6 text-purple-600" />;
      case 'Enterprise':
        return <FaCrown className="w-6 h-6 text-yellow-600" />;
      default:
        return <FaStar className="w-6 h-6 text-gray-600" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'Basic':
        return 'border-blue-200 bg-blue-50';
      case 'Pro':
        return 'border-purple-200 bg-purple-50';
      case 'Enterprise':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan Section */}
      {currentSubscription ? (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Current Plan</h2>
              <p className="text-gray-600">Your active subscription details</p>
            </div>
            <div className="flex items-center gap-2">
              {currentSubscription.plan && getPlanIcon(currentSubscription.plan.name)}
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {currentSubscription.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentSubscription.plan?.name || 'Basic'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-lg font-semibold text-gray-900">
                ${currentSubscription.plan?.price || 0}/{currentSubscription.plan?.interval || 'monthly'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Billing</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentSubscription.endDate ? new Date(currentSubscription.endDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{currentSubscription.status}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Change Plan
            </button>
            {currentSubscription.status === 'active' && (
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Current Plan</h2>
              <p className="text-gray-600">You're currently on the Basic plan</p>
            </div>
            <div className="flex items-center gap-2">
              <FaStar className="w-6 h-6 text-blue-600" />
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Basic
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="text-lg font-semibold text-gray-900">Basic</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-lg font-semibold text-gray-900">$0/monthly</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Billing</p>
              <p className="text-lg font-semibold text-gray-900">N/A</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900">Active</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
          const isUpgrade = currentSubscription?.plan && 
            ['Basic', 'Pro', 'Enterprise'].indexOf(plan.name) > 
            ['Basic', 'Pro', 'Enterprise'].indexOf(currentSubscription.plan.name);
          const isDowngrade = currentSubscription?.plan && 
            ['Basic', 'Pro', 'Enterprise'].indexOf(plan.name) < 
            ['Basic', 'Pro', 'Enterprise'].indexOf(currentSubscription.plan.name);

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 transition-all ${
                isCurrentPlan 
                  ? 'border-blue-500 bg-blue-50' 
                  : getPlanColor(plan.name)
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                {getPlanIcon(plan.name)}
                {isCurrentPlan && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Current Plan
                  </span>
                )}
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                ${plan.price}
                <span className="text-sm font-normal text-gray-600">/{plan.interval}</span>
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <FaCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Up to {plan.maxUsers} users</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Up to {plan.maxProducts} products</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">{plan.maxSalesPerMonth} sales/month</span>
                </div>
                {plan.analyticsEnabled && (
                  <div className="flex items-center gap-2">
                    <FaCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Advanced Analytics</span>
                  </div>
                )}
                {plan.advancedReports && (
                  <div className="flex items-center gap-2">
                    <FaCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Advanced Reports</span>
                  </div>
                )}
                {plan.prioritySupport && (
                  <div className="flex items-center gap-2">
                    <FaCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Priority Support</span>
                  </div>
                )}
                {plan.customBranding && (
                  <div className="flex items-center gap-2">
                    <FaCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Custom Branding</span>
                  </div>
                )}
                {plan.apiAccess && (
                  <div className="flex items-center gap-2">
                    <FaCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">API Access</span>
                  </div>
                )}
              </div>

              {!isCurrentPlan && (
                <div className="space-y-2">
                  {isUpgrade && (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={upgrading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <FaArrowUp className="w-4 h-4" />
                      {upgrading ? 'Upgrading...' : 'Upgrade'}
                    </button>
                  )}
                  {isDowngrade && (
                    <button
                      onClick={() => handleDowngrade(plan)}
                      disabled={upgrading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <FaArrowDown className="w-4 h-4" />
                      {upgrading ? 'Scheduling...' : 'Downgrade'}
                    </button>
                  )}
                  {!isUpgrade && !isDowngrade && (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={upgrading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {upgrading ? 'Processing...' : 'Select Plan'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Billing History</h2>
            <p className="text-gray-600">Your recent invoices and payments</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <FaDownload className="w-4 h-4" />
            Export All
          </button>
        </div>

        {invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaCreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Invoice #{invoice.id.slice(-8)}</p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${invoice.amount}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaHistory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No invoices yet</p>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upgrade Your Plan</h3>
            <p className="text-gray-600 mb-6">
              Choose a plan that fits your needs. You can upgrade immediately or downgrade at the end of your billing cycle.
            </p>
            
            <div className="space-y-3 mb-6">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{plan.name}</p>
                      <p className="text-sm text-gray-600">${plan.price}/{plan.interval}</p>
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <FaCheck className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {selectedPlan && (
                <button
                  onClick={() => handleUpgrade(selectedPlan)}
                  disabled={upgrading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {upgrading ? 'Processing...' : 'Upgrade'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 