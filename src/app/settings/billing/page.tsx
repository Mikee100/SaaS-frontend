"use client";

import Spinner from '../../../components/Spinner';

export default function BillingSettings() {
  // Placeholder static data
  const plan = {
    name: "Pro",
    price: "$29/mo",
    features: ["Unlimited users", "Priority support", "Advanced analytics"],
  };
  const paymentMethod = {
    type: "Visa",
    last4: "1234",
    expiry: "12/26",
  };
  const invoices = [
    { id: "inv_001", date: "2024-06-01", amount: "$29.00", status: "Paid" },
    { id: "inv_002", date: "2024-05-01", amount: "$29.00", status: "Paid" },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Billing & Subscription</h2>
      <section style={{ marginBottom: 32 }}>
        <h3>Current Plan</h3>
        <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
          <strong>{plan.name}</strong> <span>({plan.price})</span>
          <ul>
            {plan.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          <button style={{ marginTop: 8 }}>Change Plan</button>
        </div>
      </section>
      <section style={{ marginBottom: 32 }}>
        <h3>Payment Method</h3>
        <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
          <span>{paymentMethod.type} ending in {paymentMethod.last4} (exp {paymentMethod.expiry})</span>
          <br />
          <button style={{ marginTop: 8 }}>Update Payment Method</button>
        </div>
      </section>
      <section>
        <h3>Invoices</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Date</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Amount</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td>{inv.date}</td>
                <td>{inv.amount}</td>
                <td>{inv.status}</td>
                <td><button>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
} 