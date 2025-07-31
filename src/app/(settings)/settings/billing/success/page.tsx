"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import { apiGet } from "@/utils/api";

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (canceled) {
      setStatus('error');
      setMessage('Payment was canceled. You can try again anytime.');
      return;
    }

    if (success && sessionId) {
      // Verify the session was successful
      verifyPayment(sessionId);
    } else {
      setStatus('error');
      setMessage('Invalid payment session.');
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      // You could add a verification endpoint here if needed
      // For now, we'll assume success if we reach this page
      setStatus('success');
      setMessage('Payment successful! Your subscription has been activated.');
      
      // Redirect back to billing page after 3 seconds
      setTimeout(() => {
        router.push('/settings/billing');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage('Failed to verify payment. Please contact support.');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <FaTimesCircle className="h-16 w-16 text-red-500" />;
      default:
        return <FaSpinner className="h-16 w-16 text-blue-500 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Payment Successful!';
      case 'error':
        return 'Payment Failed';
      default:
        return 'Processing Payment...';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          {getIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {getTitle()}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <button
          onClick={() => router.push('/settings/billing')}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Billing
        </button>
      </div>
    </div>
  );
} 