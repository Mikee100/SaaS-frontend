"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  analyticsEnabled?: boolean;
  advancedReports?: boolean;
  prioritySupport?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: Plan;
  cancelAtPeriodEnd?: boolean;
  invoices?: Invoice[];
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  createdAt: string;
  status: string;
  url?: string;
}



export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    Promise.all([
      apiGet<Subscription>("/billing/subscription-details"),
      apiGet<Plan[]>("/billing/plans"),
      apiGet<Subscription[]>("/subscriptions/history")
    ])
      .then(([sub, plans, history]) => {
        if (sub) setSubscription(sub);
        if (plans) setPlans(plans);
        setHistory(Array.isArray(history) ? history : []);
        setSelectedPlan(sub?.plan?.id || "");
      })
      .catch(() => setError("Failed to load subscription info"))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setChanging(true);
    setError("");
    try {
      await apiPost("/billing/create-subscription", { planId: selectedPlan });
      window.location.reload();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || "Failed to change plan");
    } finally {
      setChanging(false);
    }
  };

  const handleCancel = async () => {
    setChanging(true);
    setError("");
    try {
      await apiPost("/billing/cancel-subscription", {});
      window.location.reload();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || "Failed to cancel subscription");
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Subscription & Plans</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {/* Current Subscription */}
      {/* Subscription History */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="font-semibold mb-4">Subscription History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-left">Plan</th>
                <th className="py-2 px-4 text-left">Status</th>
                <th className="py-2 px-4 text-left">Period</th>
                <th className="py-2 px-4 text-left">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {history.map(sub => (
                <tr key={sub.id}>
                  <td className="py-2 px-4">{sub.plan?.name || 'N/A'}</td>
                  <td className="py-2 px-4">{sub.status}</td>
                  <td className="py-2 px-4">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : 'N/A'} - {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-2 px-4">
                    {sub.invoices && sub.invoices.length > 0 ? (
                      <ul className="list-disc ml-4">
                        {sub.invoices?.map((inv: Invoice) => (
                          <li key={inv.id}>
                            #{inv.number} - ${inv.amount} ({new Date(inv.createdAt).toLocaleDateString()})
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
          <div className="text-center py-8 text-gray-500">No subscriptions found.</div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="font-semibold mb-4">Current Plan</h3>
        <div className="mb-2 text-lg font-bold text-blue-700">{subscription?.plan?.name || "None"}</div>
        <div className="mb-1"><span className="font-semibold">Price:</span> ${subscription?.plan?.price}/{subscription?.plan?.interval}</div>
        <div className="mb-1"><span className="font-semibold">Status:</span> {subscription?.status || "Unknown"}</div>
        <div className="mb-1"><span className="font-semibold">Renewal:</span> {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "-"}</div>
        <div className="mb-1"><span className="font-semibold">Cancel at Period End:</span> {subscription?.cancelAtPeriodEnd ? "Yes" : "No"}</div>
        <div className="mb-1"><span className="font-semibold">Max Users:</span> {subscription?.plan?.maxUsers}</div>
        <div className="mb-1"><span className="font-semibold">Max Products:</span> {subscription?.plan?.maxProducts}</div>
        <div className="mb-1"><span className="font-semibold">Max Sales/Month:</span> {subscription?.plan?.maxSalesPerMonth}</div>
        <div className="mb-1"><span className="font-semibold">Features:</span> {
          [
            subscription?.plan?.analyticsEnabled && "Analytics",
            subscription?.plan?.advancedReports && "Advanced Reports",
            subscription?.plan?.prioritySupport && "Priority Support",
            subscription?.plan?.customBranding && "Custom Branding",
            subscription?.plan?.apiAccess && "API Access"
          ].filter(Boolean).join(", ") || "Basic"
        }</div>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded mt-4"
          onClick={handleCancel}
          disabled={changing}
        >Cancel Subscription</button>
      </div>
      {/* Plan Comparison Table */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="font-semibold mb-4">Compare Plans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-left">Plan</th>
                <th className="py-2 px-4 text-left">Price</th>
                <th className="py-2 px-4 text-left">Interval</th>
                <th className="py-2 px-4 text-left">Max Users</th>
                <th className="py-2 px-4 text-left">Max Products</th>
                <th className="py-2 px-4 text-left">Max Sales/Month</th>
                <th className="py-2 px-4 text-left">Analytics</th>
                <th className="py-2 px-4 text-left">Advanced Reports</th>
                <th className="py-2 px-4 text-left">Priority Support</th>
                <th className="py-2 px-4 text-left">Custom Branding</th>
                <th className="py-2 px-4 text-left">API Access</th>
                <th className="py-2 px-4 text-left">Select</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className={plan.id === subscription?.plan?.id ? "bg-blue-50" : ""}>
                  <td className="py-2 px-4 font-bold">{plan.name}</td>
                  <td className="py-2 px-4">${plan.price}</td>
                  <td className="py-2 px-4">{plan.interval}</td>
                  <td className="py-2 px-4">{plan.maxUsers}</td>
                  <td className="py-2 px-4">{plan.maxProducts}</td>
                  <td className="py-2 px-4">{plan.maxSalesPerMonth}</td>
                  <td className="py-2 px-4">{plan.analyticsEnabled ? "✔️" : ""}</td>
                  <td className="py-2 px-4">{plan.advancedReports ? "✔️" : ""}</td>
                  <td className="py-2 px-4">{plan.prioritySupport ? "✔️" : ""}</td>
                  <td className="py-2 px-4">{plan.customBranding ? "✔️" : ""}</td>
                  <td className="py-2 px-4">{plan.apiAccess ? "✔️" : ""}</td>
                  <td className="py-2 px-4">
                    {plan.id === subscription?.plan?.id ? (
                      <span className="text-blue-600 font-semibold">Current</span>
                    ) : (
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                        onClick={() => setSelectedPlan(plan.id)}
                        disabled={changing}
                      >Select</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedPlan && selectedPlan !== subscription?.plan?.id && (
          <div className="mt-6 flex gap-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleChangePlan}
              disabled={changing}
            >Confirm Change to {plans.find(p => p.id === selectedPlan)?.name}</button>
            <button
              className="bg-gray-300 px-4 py-2 rounded"
              onClick={() => setSelectedPlan("")}
              disabled={changing}
            >Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
