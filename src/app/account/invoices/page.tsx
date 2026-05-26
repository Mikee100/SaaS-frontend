"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";

interface SubscriptionPlan {
  id: string;
  name: string;
  // Add other plan properties as needed
}

interface Subscription {
  id: string;
  plan?: SubscriptionPlan;
  // Add other subscription properties as needed
}

interface CurrentSubscription {
	id: string;
	plan?: SubscriptionPlan;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'void' | 'refunded' | 'failed';
  dueDate?: string;
  createdAt: string;
  subscription?: Subscription;
  // Add other invoice properties as needed
}

const formatKsh = (amount: number) => {
	return `Ksh ${amount.toLocaleString('en-KE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [fallbackPlanName, setFallbackPlanName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
				try {
					await apiPost('/billing/sync-records', {});
				} catch (syncError) {
					console.warn('Billing sync before invoices load failed:', syncError);
				}

				const [data, currentSubscription] = await Promise.all([
					apiGet<Invoice[]>("/account/invoices"),
					apiGet<CurrentSubscription>("/subscription/current").catch(() => null),
				]);

				if (currentSubscription?.plan?.name) {
					setFallbackPlanName(currentSubscription.plan.name);
				}

        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError("Failed to load invoices");
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

	if (loading) return <div className="p-8">Loading invoices...</div>;

	return (
		<div className="bg-white rounded-xl shadow p-6">
			<h3 className="text-xl font-bold mb-4">Invoices</h3>
			{error && <div className="text-red-600 mb-4">{error}</div>}
			{invoices.length === 0 ? (
				<p>No invoices found.</p>
			) : (
				<table className="w-full text-sm">
					<thead>
						<tr>
							<th className="py-2 text-left">Invoice #</th>
							<th className="py-2 text-left">Amount</th>
							<th className="py-2 text-left">Status</th>
							<th className="py-2 text-left">Due Date</th>
							<th className="py-2 text-left">Created</th>
							<th className="py-2 text-left">Plan</th>
						</tr>
					</thead>
					<tbody>
						{invoices.map(inv => (
							<tr key={inv.id} className="border-b">
								<td className="py-2">{inv.number}</td>
								<td className="py-2">{formatKsh(inv.amount)}</td>
								<td className="py-2">{inv.status}</td>
								<td className="py-2">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</td>
								<td className="py-2">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}</td>
								<td className="py-2">{inv.subscription?.plan?.name || fallbackPlanName || "-"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
