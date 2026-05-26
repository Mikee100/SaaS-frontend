"use client";
import BillingDashboard from '@/components/BillingDashboard';
import SaveCard from './save-card';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function BillingSettings() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <div>Loading Stripe...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BillingDashboard tenantId="demo-tenant" stripePromise={stripePromise} />
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Save Card</h2>
          <SaveCard />
        </div>
       
      </div>
    </Elements>
  );
}
