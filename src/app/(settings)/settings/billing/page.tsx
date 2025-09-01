"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import { FaCrown, FaStar, FaCheck, FaTimes, FaCreditCard, FaDownload, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { Suspense } from "react";
import dynamic from "next/dynamic";


import BillingDashboard from '@/components/BillingDashboard';
import MakePayment from './make-payment';
import SaveCard from './save-card';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';

export default function BillingSettings() {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    fetch('/stripe-config.json')
      .then((res) => res.json())
      .then((config) => {
        if (config.publishableKey) {
          setStripePromise(loadStripe(config.publishableKey));
          console.log('Loaded Stripe key from config:', config.publishableKey);
        } else {
          console.error('Stripe publishableKey not found in config');
        }
      })
      .catch((err) => {
        console.error('Failed to load Stripe config:', err);
      });
  }, []);

  if (!stripePromise) {
    return <div>Loading Stripe...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BillingDashboard tenantId="demo-tenant" />
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Save Card</h2>
          <SaveCard />
        </div>
       
      </div>
    </Elements>
  );
}
