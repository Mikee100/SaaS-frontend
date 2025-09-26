"use client";

import { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import PaymentProcessor from './PaymentProcessor';
import { apiPost } from '@/utils/api';

interface OneTimePaymentProps {
  amount: number;
  description: string;
  onSuccess?: (paymentId: string) => void;
  metadata?: Record<string, unknown>;
  buttonText?: string;
  successMessage?: string;
}

export default function OneTimePayment({
  amount,
  description,
  onSuccess,
  metadata = {},
  buttonText = 'Pay Now',
  successMessage = 'Payment successful!',
}: OneTimePaymentProps) {
  const [error, setError] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      setError(null);
      
      // Record the successful payment in your backend
      const response = await apiPost('/payments/record-one-time-payment', {
        paymentId,
        amount,
        description,
        metadata,
      }) as { success: boolean; error?: string };

      if (!response.success) {
        throw new Error(response.error || 'Failed to record payment');
      }

      setPaymentCompleted(true);
      
      if (onSuccess) {
        onSuccess(paymentId);
      }
    } catch (err: unknown) {
      console.error('Error recording payment:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to record payment');
      } else {
        setError('Failed to record payment');
      }
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (paymentCompleted) {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <FaCheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Details</h3>
          
          <div className="mt-4">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="text-sm text-gray-900">{description}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="text-sm font-medium text-gray-900">
                ${(amount / 100).toFixed(2)} USD
              </dd>
            </div>
          </div>

          <div className="mt-6">
            <PaymentProcessor
              amount={amount}
              description={description}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              metadata={metadata}
              isSubscription={false}
              buttonText={buttonText}
            />
          </div>

          <div className="mt-4 flex items-center text-sm text-gray-500">
            <FaInfoCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-blue-400" />
            <p>Your payment information is encrypted and secure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
