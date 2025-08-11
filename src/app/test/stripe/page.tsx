"use client";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Load the test component dynamically with SSR disabled
const StripeTest = dynamic(
  () => import('@/components/billing/StripeTest'),
  { ssr: false }
);

// Debug: Log all environment variables in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Environment Variables:', {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    // Add other env vars you want to check
  });
}

export default function StripeTestPage() {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Get the key directly from the environment
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    
    // Set environment variables for display
    setEnvVars({
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': key,
      'NODE_ENV': process.env.NODE_ENV || 'development',
    });

    if (!key) {
      setError('Stripe publishable key is not set. Please check your .env.local file.');
      return;
    }

    try {
      // Initialize Stripe with the key
      const stripe = loadStripe(key);
      setStripePromise(stripe);
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      setError(`Failed to initialize Stripe: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Environment Variables:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </div>
          <p className="text-sm text-gray-600">
            Make sure you have a valid <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in your <code className="bg-gray-100 px-1 rounded">.env.local</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">Stripe Elements Test</h1>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="font-semibold mb-2">Environment Variables:</h3>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>
        
        {stripePromise ? (
          <div className="bg-white p-8 rounded-lg shadow">
            <Elements stripe={stripePromise}>
              <StripeTest />
            </Elements>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Initializing Stripe...</p>
          </div>
        )}
      </div>
    </div>
  );
}
