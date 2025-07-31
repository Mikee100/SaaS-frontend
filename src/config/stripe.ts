export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  priceIds: {
    basic: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || 'price_basic_monthly',
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
  },
  // Map plan names to price IDs
  planToPriceId: {
    'Basic': process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || 'price_basic_monthly',
    'Pro': process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    'Enterprise': process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
  },
  // Map price IDs to plan names
  priceIdToPlan: {
    [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || 'price_basic_monthly']: 'Basic',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly']: 'Pro',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly']: 'Enterprise',
  },
};

export const validateStripeConfig = () => {
  const requiredVars = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing Stripe environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

export const getPriceIdForPlan = (planName: string): string => {
  return stripeConfig.planToPriceId[planName as keyof typeof stripeConfig.planToPriceId] || stripeConfig.priceIds.basic;
};

export const getPlanForPriceId = (priceId: string): string => {
  return stripeConfig.priceIdToPlan[priceId] || 'Basic';
}; 