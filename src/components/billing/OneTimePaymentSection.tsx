"use client";

import { useState } from 'react';
import { FaCreditCard, FaPlus, FaCheck, FaInfoCircle } from 'react-icons/fa';
import OneTimePayment from '../OneTimePayment';
import { apiPost } from '@/utils/api';

interface OneTimePaymentSectionProps {
  onPaymentSuccess?: (payment: any) => void;
  tenantId: string;
}

export default function OneTimePaymentSection({ onPaymentSuccess, tenantId }: OneTimePaymentSectionProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetAmounts = [1000, 2500, 5000, 10000]; // Amounts in cents ($10, $25, $50, $100)

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setShowPaymentForm(true);
  };

  const handleCustomAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      setError('Please enter a valid amount (minimum $1)');
      return;
    }
    setSelectedAmount(Math.round(amount * 100)); // Convert to cents
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      setLoading(true);
      
      // Record the payment in your backend
      const response = await apiPost('/billing/record-one-time-payment', {
        paymentId,
        amount: selectedAmount,
        description: `One-time payment of $${(selectedAmount! / 100).toFixed(2)}`,
        metadata: {
          type: 'one_time_payment',
          tenantId,
        },
      });

      if (response.success && onPaymentSuccess) {
        onPaymentSuccess(response.payment);
      }

      // Reset form
      setShowPaymentForm(false);
      setSelectedAmount(null);
      setCustomAmount('');
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (showPaymentForm && selectedAmount !== null) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Pay ${(selectedAmount / 100).toFixed(2)}
        </h3>
        
        <OneTimePayment
          amount={selectedAmount}
          description={`One-time payment of $${(selectedAmount / 100).toFixed(2)}`}
          onSuccess={handlePaymentSuccess}
          onError={(error) => setError(error)}
          buttonText={`Pay $${(selectedAmount / 100).toFixed(2)}`}
          successMessage="Payment successful! Thank you for your purchase."
        />
        
        <button
          type="button"
          onClick={() => {
            setShowPaymentForm(false);
            setError(null);
          }}
          className="mt-4 text-sm text-gray-600 hover:text-gray-800"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Make a One-Time Payment</h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Add credit to your account or make a one-time payment.
      </p>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaInfoCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        {presetAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleAmountSelect(amount)}
            className="relative border border-gray-300 rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ${(amount / 100).toFixed(2)}
            {amount >= 5000 && (
              <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                +{(amount / 1000) * 10}%
              </span>
            )}
          </button>
        ))}
      </div>
      
      <form onSubmit={handleCustomAmount} className="flex">
        <div className="relative rounded-md shadow-sm flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            min="1"
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom amount"
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-l-md"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <span className="text-gray-500 sm:text-sm mr-3">USD</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={!customAmount || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaCreditCard className="-ml-1 mr-2 h-4 w-4" />
          Pay
        </button>
      </form>
      
      <div className="mt-4 flex items-center text-xs text-gray-500">
        <FaInfoCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-blue-400" />
        <p>Payments are processed securely with Stripe. Your card details are never stored on our servers.</p>
      </div>
    </div>
  );
}