"use client";
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiPost, apiGet } from '@/utils/api';
import { FaCreditCard, FaLock, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentProcessorProps {
  amount: number;
  currency?: string;
  description: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  metadata?: Record<string, any>;
}

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

function PaymentForm({ amount, currency = 'usd', description, onSuccess, onError, metadata }: PaymentProcessorProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [useSavedMethod, setUseSavedMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await apiGet('/payments/methods');
      if (response.success) {
        setSavedPaymentMethods(response.methods);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (useSavedMethod && selectedMethod) {
        // Use saved payment method
        const result = await apiPost('/payments/process', {
          amount,
          currency,
          description,
          metadata: { ...metadata, paymentMethodId: selectedMethod },
        });

        if (result.success) {
          onSuccess?.(result.paymentId);
        } else {
          setError(result.error || 'Payment failed');
          onError?.(result.error || 'Payment failed');
        }
      } else {
        // Create payment intent
        const result = await apiPost('/payments/process', {
          amount,
          currency,
          description,
          metadata,
        });

        if (!result.success) {
          setError(result.error || 'Failed to create payment intent');
          onError?.(result.error || 'Failed to create payment intent');
          return;
        }

        // Confirm payment with Stripe
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          setError('Card element not found');
          onError?.('Card element not found');
          return;
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          result.clientSecret,
          {
            payment_method: {
              card: cardElement,
            },
          }
        );

        if (stripeError) {
          setError(stripeError.message || 'Payment failed');
          onError?.(stripeError.message || 'Payment failed');
        } else if (paymentIntent.status === 'succeeded') {
          // Confirm payment on backend
          const confirmResult = await apiPost('/payments/confirm', {
            paymentId: result.paymentId,
            paymentIntentId: paymentIntent.id,
          });

          if (confirmResult.success) {
            onSuccess?.(result.paymentId);
          } else {
            setError(confirmResult.error || 'Payment confirmation failed');
            onError?.(confirmResult.error || 'Payment confirmation failed');
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async (paymentMethodId: string) => {
    try {
      await apiPost('/payments/methods', { paymentMethodId });
      await loadPaymentMethods();
    } catch (error) {
      console.error('Failed to save payment method:', error);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      await apiPost('/payments/methods/remove', { paymentMethodId });
      await loadPaymentMethods();
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Saved Payment Methods */}
        {savedPaymentMethods.length > 0 && (
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useSavedMethod}
                onChange={(e) => setUseSavedMethod(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Use saved payment method
              </span>
            </label>

            {useSavedMethod && (
              <div className="space-y-2">
                {savedPaymentMethods.map((method) => (
                  <label key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedMethod === method.id}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FaCreditCard className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {method.card.brand.toUpperCase()} •••• {method.card.last4}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Expires {method.card.exp_month}/{method.card.exp_year}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Card Form */}
        {!useSavedMethod && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Details
              </label>
              <div className="border border-gray-300 rounded-lg p-3">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </div>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">
                Save this payment method for future use
              </span>
            </label>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{description}</span>
            <span className="font-semibold">
              ${amount.toFixed(2)} {currency.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <FaExclamationTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !stripe}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <FaLock className="w-4 h-4" />
              <span>Pay ${amount.toFixed(2)}</span>
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <FaLock className="w-3 h-3" />
          <span>Your payment information is secure and encrypted</span>
        </div>
      </form>
    </div>
  );
}

export default function PaymentProcessor(props: PaymentProcessorProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
} 