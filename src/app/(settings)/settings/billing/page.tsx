"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/utils/api";
import { FaCrown, FaCheck, FaTimes, FaCreditCard, FaReceipt, FaHistory, FaSpinner, FaExclamationTriangle, FaInfoCircle, FaChartLine, FaLock } from "react-icons/fa";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { getPriceIdForPlan, validateStripeConfig } from "@/config/stripe";
import PaymentProcessor from "@/components/PaymentProcessor";
import BillingDashboard from "@/components/BillingDashboard";
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';

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
  bulkOperations: boolean;
  dataExport: boolean;
  customFields: boolean;
  advancedSecurity: boolean;
  whiteLabel: boolean;
  dedicatedSupport: boolean;
  ssoEnabled: boolean;
  auditLogs: boolean;
  backupRestore: boolean;
  customIntegrations: boolean;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  stripeInvoiceId?: string;
}

export default function BillingPage() {
  const { user } = useUser();
  const { limits, hasFeature } = usePlanLimits();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchBillingData();
  }, []);

  // Check if Stripe is configured
  const isStripeConfigured = () => {
    // For development, always allow payments for testing
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return true;
    }
    return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  };

  async function fetchBillingData() {
    try {
      setLoading(true);
      setError("");
      const [plansData, subscriptionData, invoicesData] = await Promise.all([
        apiGet("/billing/plans"),
        apiGet("/billing/subscription"),
        apiGet("/billing/invoices"),
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
      setInvoices(invoicesData);
    } catch (err: any) {
      setError(err.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

    async function handleUpgrade(planId: string) {
    try {
      setLoadingCheckout(true);
      setError("");

      // Get the plan details
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        setError("Payment processing is not available. Please configure Stripe first. See STRIPE_SETUP_GUIDE.md for instructions.");
        return;
      }

      // For development mode without Stripe, create subscription directly
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        try {
          // Create subscription directly in development mode
          await apiPost("/billing/create-subscription", {
            planId: planId,
          });
          setSuccess(`Development mode: Successfully upgraded to ${plan.name} plan!`);
          await fetchBillingData(); // Refresh data
        } catch (err: any) {
          setError(err.message || "Failed to create subscription in development mode");
        }
        return;
      }

      // Create checkout session
      const response = await apiPost("/billing/create-checkout-session", {
        priceId: getPriceIdForPlan(plan.name),
        successUrl: `${window.location.origin}/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/settings/billing?canceled=true`,
      });

      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create checkout session");
    } finally {
      setLoadingCheckout(false);
    }
  }

  async function handleManageBilling() {
    try {
      setLoadingPortal(true);
      setError("");
      setSuccess("");

             if (!isStripeConfigured()) {
         setError("Stripe is not configured. Please configure Stripe first.");
         return;
       }

      const response = await apiPost("/billing/create-portal-session", {
        returnUrl: `${window.location.origin}/settings/billing`,
      });

      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("Failed to create billing portal session");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create billing portal session");
    } finally {
      setLoadingPortal(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await apiPost("/billing/cancel-subscription", {});
      setSuccess("Subscription will be canceled at the end of the current billing period.");
      await fetchBillingData(); // Refresh data
    } catch (err: any) {
      // Handle specific error messages from the backend
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || "Failed to cancel subscription");
      }
    }
  }

  async function handleCleanupOrphanedSubscriptions() {
    if (!confirm("This will clean up any orphaned subscriptions that don't have proper Stripe IDs. Continue?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await apiPost("/billing/cleanup-orphaned-subscriptions", {});
      setSuccess("Orphaned subscriptions cleaned up successfully.");
      await fetchBillingData(); // Refresh data
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || "Failed to cleanup orphaned subscriptions");
      }
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  }

  // Check for success/canceled URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess('Payment successful! Your subscription has been updated.');
      fetchBillingData();
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      setError('Payment was canceled. Your subscription remains unchanged.');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Permission checks
  const canViewBilling = hasPermission(user, 'view_billing');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has permission to view billing
  if (!canViewBilling) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaLock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view billing information.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Billing & Subscription</h1>
          <p className="mt-2 text-lg text-gray-500">Manage your subscription and billing information.</p>
        </header>

        {/* Stripe Status Warning */}
        {!isStripeConfigured() && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Payment Processing Unavailable</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  Stripe is not configured. 
                  <a href="/settings/billing/stripe-config" className="text-blue-600 hover:text-blue-800 underline ml-1">
                    Configure Stripe now
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <FaCheck className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <FaTimes className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
              {subscription.plan.name === 'Enterprise' && subscription.status !== 'none' && (
                <FaCrown className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {subscription.status === 'none' ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Basic Plan</h3>
                    <p className="text-3xl font-bold text-indigo-600 mb-2">Free</p>
                    <p className="text-gray-600 mb-4">
                      Status: <span className="font-semibold text-gray-600">No Active Subscription</span>
                    </p>
                    <div className="text-sm text-gray-600">
                      <p>No active billing period</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{subscription.plan.name} Plan</h3>
                    <p className="text-3xl font-bold text-indigo-600 mb-2">
                      {subscription.plan.price === 0 ? 'Free' : `$${subscription.plan.price}/month`}
                    </p>
                    <p className="text-gray-600 mb-4">
                      Status: <span className={`font-semibold ${
                        subscription.status === 'active' ? 'text-green-600' : 
                        subscription.status === 'canceled' ? 'text-red-600' : 
                        subscription.status === 'none' ? 'text-gray-600' : 'text-yellow-600'
                      }`}>
                        {subscription.status === 'none' ? 'No Active Subscription' : 
                         subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </p>
                    
                    {subscription.cancelAtPeriodEnd && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          Your subscription will be canceled at the end of the current billing period.
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                        <p>Current period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                      ) : (
                        <p>No active billing period</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleManageBilling}
                  disabled={loadingPortal || !isStripeConfigured() || subscription.status === 'none'}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPortal ? (
                    <FaSpinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <FaCreditCard className="h-4 w-4" />
                  )}
                  {loadingPortal ? 'Loading...' : 'Manage Billing'}
                </button>

                {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && subscription.id && (
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plan Comparison */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
          
          {!isStripeConfigured() && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Payment Setup Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    To enable payments, configure Stripe in your environment variables. 
                    See the STRIPE_SETUP.md file for instructions.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl shadow-md p-6 relative">
                {plan.name === 'Enterprise' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <FaCrown className="h-6 w-6 text-yellow-500" />
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-indigo-600 mb-1">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </p>
                  <p className="text-gray-500">per month</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">
                      {plan.maxUsers === null || plan.maxUsers === undefined ? 'Unlimited' : plan.maxUsers} users
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">
                      {plan.maxProducts === null || plan.maxProducts === undefined ? 'Unlimited' : plan.maxProducts} products
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">
                      {plan.maxSalesPerMonth === null || plan.maxSalesPerMonth === undefined ? 'Unlimited' : plan.maxSalesPerMonth} sales/month
                    </span>
                  </div>
                  {plan.analyticsEnabled && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Analytics</span>
                    </div>
                  )}
                  {plan.advancedReports && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Advanced Reports</span>
                    </div>
                  )}
                  {plan.bulkOperations && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Bulk Operations</span>
                    </div>
                  )}
                  {plan.dataExport && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Data Export</span>
                    </div>
                  )}
                  {plan.customBranding && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Custom Branding</span>
                    </div>
                  )}
                  {plan.apiAccess && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">API Access</span>
                    </div>
                  )}
                  {plan.whiteLabel && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">White Label</span>
                    </div>
                  )}
                  {plan.dedicatedSupport && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Dedicated Support</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loadingCheckout || (subscription?.status !== 'none' && subscription?.plan.id === plan.id) || !isStripeConfigured()}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    (subscription?.status !== 'none' && subscription?.plan.id === plan.id)
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : !isStripeConfigured()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {(subscription?.status !== 'none' && subscription?.plan.id === plan.id) ? 'Current Plan' : 
                   !isStripeConfigured() ? 'Setup Required' :
                   loadingCheckout ? (
                     <span className="flex items-center justify-center gap-2">
                       <FaSpinner className="h-4 w-4 animate-spin" />
                       Processing...
                     </span>
                   ) : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Analytics Dashboard */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FaChartLine className="h-6 w-6" />
            Payment Analytics
          </h2>
          <BillingDashboard tenantId="current" />
        </div>

        {/* One-Time Payment Section */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FaCreditCard className="h-6 w-6" />
            One-Time Payment
          </h2>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Payment</h3>
              <PaymentProcessor
                amount={29.99}
                currency="usd"
                description="Test payment for SaaS platform"
                onSuccess={(paymentId) => {
                  setSuccess(`Payment successful! Payment ID: ${paymentId}`);
                  fetchBillingData();
                }}
                onError={(error) => {
                  setError(`Payment failed: ${error}`);
                }}
                metadata={{ type: 'test_payment' }}
              />
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FaHistory className="h-6 w-6" />
            Billing History
          </h2>
          
          {invoices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <FaReceipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No billing history available.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.stripeInvoiceId || invoice.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 