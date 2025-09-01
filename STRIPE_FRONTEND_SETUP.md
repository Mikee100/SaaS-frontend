# Frontend Stripe Integration Guide

## Overview
This guide covers the frontend integration with Stripe for secure billing and subscription management.

## Features Implemented

### 1. **Secure Billing Interface**
- ✅ Stripe Checkout integration
- ✅ Billing portal access
- ✅ Subscription management
- ✅ Invoice history display

### 2. **Plan-Based Access Control**
- ✅ Feature cards with upgrade prompts
- ✅ Plan comparison interface
- ✅ Current subscription display

### 3. **User Experience**
- ✅ Loading states and error handling
- ✅ Success/cancel page handling
- ✅ Responsive design
- ✅ Clear upgrade paths

## Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (must match backend)
NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID=price_basic_monthly
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_pro_monthly
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

## Components Created

### 1. **BillingPage** (`/settings/billing/page.tsx`)
- Main billing interface
- Plan comparison
- Subscription management
- Invoice history

### 2. **BillingSuccessPage** (`/settings/billing/success/page.tsx`)
- Handles Stripe checkout success/cancel
- Payment verification
- User feedback

### 3. **BillingFeatureCard** (`/components/BillingFeatureCard.tsx`)
- Displays features with plan requirements
- Upgrade prompts for restricted features
- Plan-based access control

### 4. **useBilling Hook** (`/hooks/useBilling.ts`)
- Manages billing state
- Handles Stripe API calls
- Error handling and loading states

## API Integration

### Backend Endpoints Used

```typescript
// Get billing data
GET /billing/plans
GET /billing/subscription
GET /billing/invoices

// Stripe operations
POST /billing/create-checkout-session
POST /billing/create-portal-session
POST /billing/cancel-subscription
```

### Frontend API Calls

```typescript
// Create checkout session
const response = await apiPost('/billing/create-checkout-session', {
  priceId: 'price_pro_monthly',
  successUrl: 'https://your-app.com/settings/billing?success=true',
  cancelUrl: 'https://your-app.com/settings/billing?canceled=true',
});

// Redirect to Stripe
if (response.url) {
  window.location.href = response.url;
}
```

## User Flow

### 1. **Plan Selection**
1. User visits `/settings/billing`
2. Views available plans and features
3. Clicks "Upgrade" on desired plan
4. Redirected to Stripe Checkout

### 2. **Payment Processing**
1. User completes payment on Stripe
2. Redirected to success/cancel page
3. Webhook updates subscription in backend
4. User returns to billing page

### 3. **Subscription Management**
1. User clicks "Manage Billing"
2. Redirected to Stripe Customer Portal
3. Can update payment methods, cancel, etc.
4. Returns to billing page

## Security Features

### 1. **Client-Side Security**
- No sensitive data stored in frontend
- All payments processed by Stripe
- Environment variables for configuration

### 2. **Error Handling**
- Graceful error display
- User-friendly error messages
- Loading states for better UX

### 3. **Access Control**
- Plan-based feature restrictions
- Upgrade prompts for premium features
- Clear indication of plan requirements

## Styling and UX

### 1. **Design System**
- Consistent with app theme
- Responsive design
- Loading states and animations

### 2. **User Experience**
- Clear plan comparison
- Easy upgrade process
- Transparent pricing
- Feature explanations

### 3. **Accessibility**
- Proper ARIA labels
- Keyboard navigation
- Screen reader support

## Testing

### 1. **Test Cards**
Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

### 2. **Test Scenarios**
- Plan upgrade flow
- Payment cancellation
- Error handling
- Responsive design

### 3. **Browser Testing**
- Chrome, Firefox, Safari
- Mobile browsers
- Different screen sizes

## Integration Points

### 1. **Plan Limits Hook**
```typescript
import { usePlanLimits } from '@/hooks/usePlanLimits';

const { limits, hasFeature } = usePlanLimits();
```

### 2. **Billing Hook**
```typescript
import { useBilling } from '@/hooks/useBilling';

const { 
  billingData, 
  createCheckoutSession, 
  createPortalSession 
} = useBilling();
```

### 3. **Feature Cards**
```typescript
import BillingFeatureCard from '@/components/BillingFeatureCard';

<BillingFeatureCard
  title="Advanced Analytics"
  description="Get detailed insights into your business"
  icon={<FaChartLine />}
  requiredPlan="Pro"
  onUpgrade={() => handleUpgrade('pro')}
>
  {/* Feature content */}
</BillingFeatureCard>
```

## Error Handling

### 1. **Network Errors**
- Retry logic for failed requests
- User-friendly error messages
- Fallback to cached data

### 2. **Payment Errors**
- Clear error explanations
- Alternative payment options
- Support contact information

### 3. **Validation Errors**
- Form validation
- Real-time feedback
- Clear error indicators

## Performance Optimization

### 1. **Code Splitting**
- Lazy load billing components
- Separate bundle for Stripe
- Optimized imports

### 2. **Caching**
- Cache billing data
- Optimistic updates
- Background refresh

### 3. **Loading States**
- Skeleton loaders
- Progressive enhancement
- Smooth transitions

## Monitoring

### 1. **Analytics**
- Track upgrade conversions
- Monitor payment success rates
- User behavior analysis

### 2. **Error Tracking**
- Capture payment errors
- Monitor API failures
- User feedback collection

### 3. **Performance Monitoring**
- Page load times
- API response times
- User interaction metrics

## Troubleshooting

### Common Issues

1. **Checkout not loading**
   - Check Stripe publishable key
   - Verify price IDs exist
   - Check network connectivity

2. **Payment fails**
   - Verify test card numbers
   - Check Stripe dashboard
   - Review error logs

3. **Webhook issues**
   - Verify webhook endpoint
   - Check signature verification
   - Monitor webhook logs

### Debug Mode

Enable debug logging:
```typescript
// In development
console.log('Stripe config:', stripeConfig);
console.log('Billing data:', billingData);
```

## Best Practices

### 1. **Security**
- Never expose secret keys
- Validate all inputs
- Use HTTPS in production

### 2. **User Experience**
- Clear pricing information
- Easy upgrade process
- Transparent feature access

### 3. **Code Quality**
- Type safety with TypeScript
- Error boundaries
- Comprehensive testing

## Support

For frontend-specific issues:
- Check browser console for errors
- Verify environment variables
- Test with different browsers

For Stripe integration issues:
- Check Stripe dashboard
- Review webhook logs
- Contact Stripe support 