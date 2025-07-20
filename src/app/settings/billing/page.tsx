"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function BillingSettings() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/billing").then((data) => setBilling(data)).catch(() => setError("Failed to load billing info")).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 32 }}>Billing</h2>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
      ) : !billing ? (
        <div style={{ color: '#888' }}>No billing info found.</div>
      ) : (
        <>
          <section style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Current Plan</div>
            <div style={{ fontSize: 16, color: '#333', marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{billing.plan || '-'}</span>
              {billing.status && (
                <span style={{ marginLeft: 16, fontSize: 15, color: billing.status === 'active' ? '#22c55e' : '#888' }}>
                  {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, color: '#666' }}>
              Next Payment: {billing.nextPayment ? new Date(billing.nextPayment).toLocaleDateString() : '-'}
            </div>
          </section>
          <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '32px 0' }} />
          <section style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Payment Method</div>
            <div style={{ fontSize: 16, color: '#333' }}>{billing.paymentMethod || '-'}</div>
          </section>
          {billing.invoices && billing.invoices.length > 0 && (
            <section>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Invoices</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#444' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 0', color: '#555' }}>{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '8px 0', color: '#555' }}>{inv.amount || '-'}</td>
                      <td style={{ padding: '8px 0', color: inv.status === 'Paid' ? '#22c55e' : '#888' }}>{inv.status}</td>
                      <td style={{ padding: '8px 0', color: '#555' }}><a href={inv.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Download</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
} 