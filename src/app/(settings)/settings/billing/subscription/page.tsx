"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    Promise.all([
      apiGet("/billing/subscription-details"),
      apiGet("/billing/plans")
    ])
      .then(([sub, plans]) => {
        setSubscription(sub);
        setPlans(plans);
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
    } catch (err: any) {
      setError(err.message || "Failed to change plan");
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
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Subscription Management</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="mb-4">
          <span className="font-semibold">Current Plan:</span> {subscription?.plan?.name || "None"}
        </div>
        <div className="mb-4">
          <span className="font-semibold">Status:</span> {subscription?.status || "Unknown"}
        </div>
        <div className="mb-4">
          <span className="font-semibold">Renewal:</span> {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "-"}
        </div>
        <div className="mb-4">
          <span className="font-semibold">Cancel at Period End:</span> {subscription?.cancelAtPeriodEnd ? "Yes" : "No"}
        </div>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded mt-2"
          onClick={handleCancel}
          disabled={changing}
        >Cancel Subscription</button>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold mb-4">Change Plan</h3>
        <select
          className="border rounded px-3 py-2 mb-4"
          value={selectedPlan}
          onChange={e => setSelectedPlan(e.target.value)}
        >
          {plans.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.name} (${plan.price})</option>
          ))}
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleChangePlan}
          disabled={changing}
        >Change Plan</button>
      </div>
    </div>
  );
}
