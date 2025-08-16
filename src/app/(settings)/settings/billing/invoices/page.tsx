"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function InvoicesPage() {
	const [invoices, setInvoices] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		apiGet("/billing/invoices")
			.then(setInvoices)
			.catch(() => setError("Failed to load invoices"))
			.finally(() => setLoading(false));
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
								<td className="py-2">${inv.amount}</td>
								<td className="py-2">{inv.status}</td>
								<td className="py-2">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</td>
								<td className="py-2">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}</td>
								<td className="py-2">{inv.subscription?.plan?.name || "-"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
