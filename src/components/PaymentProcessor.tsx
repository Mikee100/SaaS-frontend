"use client";
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiPost, apiGet } from '@/utils/api';

interface PaymentProcessorProps {
  amount: number;
  currency?: string;
  description: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  metadata?: Record<string, any>;
  isSubscription?: boolean;
  buttonText?: string;
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentForm({ 
  amount, 
  currency = 'usd', 
  description, 
  onSuccess, 
  onError,
  metadata = {},
  isSubscription = true,
  buttonText = 'Pay Now'
}: PaymentProcessorProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await apiGet('/payments/methods');
        setSavedPaymentMethods(methods);
      } catch (err) {
        console.error('Error loading payment methods:', err);
      }
    };
    loadPaymentMethods();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!stripe || !elements) {
      setError('Stripe has not been initialized');
      setIsLoading(false);
      return;
    }

    try {
      let paymentIntent;
      
      if (selectedPaymentMethod) {
        // Use saved payment method
        paymentIntent = await apiPost('/payments/create-payment-intent', {
          amount,
          currency,
          description,
          metadata,
          paymentMethodId: selectedPaymentMethod,
          savePaymentMethod: false
        });
      } else {
        // Create new payment method
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { error: submitError, paymentIntent: createdPaymentIntent } = await stripe.confirmCardPayment(
          (await apiPost('/payments/create-payment-intent', {
            amount,
            currency,
            description,
            metadata,
            savePaymentMethod: true
          })).clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: 'Customer Name', // You might want to get this from user input
              },
            },
            save_payment_method: true,
          }
        );

        if (submitError) {
          throw submitError;
        }
        paymentIntent = createdPaymentIntent;
      }

      if (paymentIntent.status === 'succeeded') {
        // Record the payment
        const result = await apiPost('/payments/record-one-time-payment', {
          paymentId: paymentIntent.id,
          amount: paymentIntent.amount,
          description,
          metadata
        });

        onSuccess?.(paymentIntent.id);
      } else {
        throw new Error('Payment failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during payment';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {savedPaymentMethods.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Saved Payment Methods
          </label>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="">New Payment Method</option>
            {savedPaymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.card.brand.toUpperCase()} ending in {method.card.last4} 
                (expires {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)})
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedPaymentMethod && (
        <div className="mb-4">
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
      )}

      {error && (
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${!stripe || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Processing...' : buttonText}
      </button>
    </form>
  );
}

export default function PaymentProcessor(props: PaymentProcessorProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}