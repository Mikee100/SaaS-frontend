

import React, { useEffect, useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

const cardBrandIcon = (brand: string) => {
  switch (brand.toLowerCase()) {
    case "visa":
      return <img src="/globe.svg" alt="Visa" className="inline w-6 h-6 mr-2" />;
    case "mastercard":
      return <img src="/window.svg" alt="Mastercard" className="inline w-6 h-6 mr-2" />;
    default:
      return <img src="/icon.svg" alt={brand} className="inline w-6 h-6 mr-2" />;
  }
};

export default function BillingCards() {
  const stripe = useStripe();
  const elements = useElements();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch saved cards
  const fetchMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`${apiUrl}/payments/methods`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setMethods(data.methods);
      } else {
        setError(data.error || "Failed to fetch payment methods");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save new card
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    if (!stripe || !elements) {
      setError("Stripe not loaded");
      setSaving(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      setSaving(false);
      return;
    }

    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (stripeError || !paymentMethod) {
      setError(stripeError?.message || "Failed to create payment method");
      setSaving(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`${apiUrl}/payments/methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });
      if (!res.ok) throw new Error("Failed to save payment method");
      setSuccess(true);
      fetchMethods(); // Refresh list after saving
    } catch (err: any) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Saved Cards</h2>
      <div className="border-b pb-4 mb-4">
        {loading ? (
          <div className="animate-pulse text-gray-500">Loading saved cards...</div>
        ) : error ? (
          <div className="text-red-600">Error: {error}</div>
        ) : methods.length === 0 ? (
          <div className="text-gray-600 flex flex-col items-center">
            <span className="mb-2">No saved cards found.</span>
            <span className="text-blue-600">Add a card below to get started!</span>
          </div>
        ) : (
          <ul className="mb-2">
            {methods.map((method) => (
              <li key={method.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                {method.type === "card" && method.card ? (
                  <>
                    {cardBrandIcon(method.card.brand)}
                    <span className="font-semibold text-lg">•••• {method.card.last4}</span>
                    <span className="ml-2 text-gray-500">Expires {method.card.expMonth}/{method.card.expYear}</span>
                  </>
                ) : (
                  <span>{method.type}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Add New Card</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Card saved successfully!</div>}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Card"}
        </button>
      </form>
    </div>
  );
}
