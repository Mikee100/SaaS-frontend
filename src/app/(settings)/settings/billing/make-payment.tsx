import { useState, useEffect } from "react";

export default function MakePayment() {
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<{id: string, brand?: string, last4?: string}[]>([]);
  const [fetchingMethods, setFetchingMethods] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      setFetchingMethods(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/payments/methods`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setMethods(data.methods || []);
          if (data.methods && data.methods.length > 0) {
            setPaymentMethodId(data.methods[0].id);
          }
        }
      } catch {}
      setFetchingMethods(false);
    };
    fetchMethods();
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/payments/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId,
          amount: parseFloat(amount),
          currency: "USD",
          description: "Test payment from user UI",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("Payment successful!");
      } else {
        setStatus(data.error || "Payment failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setStatus(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
      <input
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="border rounded px-3 py-2 w-40"
        required
      />
      <label className="block text-sm font-medium text-gray-700">Select Card</label>
      <select
        value={paymentMethodId}
        onChange={e => setPaymentMethodId(e.target.value)}
        className="border rounded px-3 py-2 w-64"
        disabled={fetchingMethods || methods.length === 0}
        required
      >
        {methods.length === 0 ? (
          <option value="">No saved cards</option>
        ) : (
          methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.brand ? `${m.brand} ` : ''}{m.last4 ? `•••• ${m.last4}` : m.id}
            </option>
          ))
        )}
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        disabled={loading || !paymentMethodId}
      >
        {loading ? "Processing..." : "Make Payment"}
      </button>
      {status && (
        <div className={status.includes("successful") ? "text-green-600" : "text-red-600"}>
          {status}
        </div>
      )}
    </form>
  );
}
