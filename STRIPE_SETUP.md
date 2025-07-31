# Stripe Setup Guide for Frontend

## Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (create these in your Stripe dashboard)
NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID=price_basic_monthly
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_pro_monthly
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

## Backend Environment Variables

Add these to your backend `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (same as frontend)
STRIPE_BASIC_PRICE_ID=price_basic_monthly
STRIPE_PRO_PRICE_ID=price_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

## Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to your Stripe Dashboard
2. Navigate to Products > Add Product
3. Create three products:
   - **Basic Plan** ($0/month)
   - **Pro Plan** ($29/month)
   - **Enterprise Plan** ($99/month)

### 2. Get Price IDs

1. For each product, create a recurring price
2. Copy the price IDs (e.g., `price_1ABC123DEF456`)
3. Add them to your environment variables

### 3. Set Up Webhooks

1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/billing/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. Get Webhook Secret

1. After creating the webhook, click on it
2. Copy the signing secret
3. Add it to your backend `.env` file as `STRIPE_WEBHOOK_SECRET`

## Testing

### Test Cards

Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

### Test Mode

Make sure you're using test keys:
- Publishable key starts with `pk_test_`
- Secret key starts with `sk_test_`

## Features Implemented

✅ **Checkout Sessions** - Secure payment flow
✅ **Billing Portal** - Customer self-service
✅ **Webhook Handling** - Real-time updates
✅ **Subscription Management** - Upgrade/downgrade/cancel
✅ **Invoice History** - Complete billing records
✅ **Error Handling** - Graceful failure handling
✅ **Loading States** - Better UX during processing
✅ **Success/Cancel Handling** - URL parameter processing

## Security Features

✅ **Webhook Signature Verification** - Prevents spoofing
✅ **Environment Variable Protection** - Keys not exposed
✅ **Input Validation** - All inputs validated
✅ **Error Logging** - Comprehensive error tracking
✅ **Audit Trail** - All billing events logged

## Troubleshooting

### Common Issues

1. **"Payment processing is not available"**
   - Check if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
   - Verify the key is valid and in test mode

2. **"Failed to create checkout session"**
   - Check backend Stripe configuration
   - Verify price IDs exist in Stripe dashboard
   - Check backend logs for detailed errors

3. **Webhook not working**
   - Verify webhook endpoint URL
   - Check webhook secret in backend
   - Ensure HTTPS for production

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Production Checklist

- [ ] Set up production Stripe account
- [ ] Configure production webhook endpoints
- [ ] Update environment variables with production keys
- [ ] Test all billing flows in production
- [ ] Set up monitoring and alerts
- [ ] Configure SSL certificates
- [ ] Test webhook signature verification
- [ ] Monitor payment success rates 