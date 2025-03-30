# Stripe Integration Plan

## Service Architecture

### StripeService Class
- Implement as part of the service provider pattern
- Responsible for all Stripe-related operations
- Will be injected with database connection for persistence

## Core Functionalities

### 1. Checkout Sessions
- **createCheckoutSession(userId, priceId, successUrl, cancelUrl)**
  - Creates a Stripe Checkout Session for initial subscription purchase
  - Stores session ID in database linked to user
  - Returns session URL for client redirect

### 2. Customer Portal
- **createCustomerPortalSession(userId, returnUrl)**
  - Creates a Stripe Customer Portal Session for subscription management
  - Returns portal URL for client redirect
  - Allows users to update payment methods, view invoices, etc.

## Webhook Handling

### Checkout Events
1. **checkout.session.completed**
   - Triggered when checkout process finishes
   - Link Stripe customer ID to user record if new
   - Do NOT upgrade to premium yet (wait for payment confirmation)
   - Store checkout session data for reference

### Subscription Events
1. **customer.subscription.created**
   - Triggered when subscription is initially created
   - Create subscription record in database
   - Note: Premium access should NOT be granted until payment confirmation

2. **customer.subscription.updated**
   - Triggered when subscription details change
   - Update subscription record in database
   - Handle "cancel at period end" flag (when user requests cancellation)
   - Adjust user permissions if plan changed

3. **customer.subscription.deleted**
   - Triggered when subscription is immediately cancelled
   - Mark subscription as inactive in database
   - Immediately downgrade user to free tier

### Payment Events
1. **invoice.paid**
   - CRITICAL: Triggered when payment is successful
   - For first-time subscriptions: THIS is when to grant premium access
   - For renewals: Extend subscription period
   - Update subscription status to active

2. **invoice.payment_failed**
   - Triggered when payment method fails
   - Mark subscription as past due
   - Send notification to user
   - If final attempt failed, downgrade to free tier

3. **invoice.payment_action_required**
   - Triggered when additional authentication is needed
   - Notify user to complete payment
   - Store pending status

4. **customer.subscription.trial_will_end**
   - Optional: For trial-based subscriptions
   - Send notification before trial expires

### Customer Events
1. **customer.updated**
   - Update customer information in database
   - Handle changes to default payment method

## Database Schema Updates

### User Table
- Add `stripeCustomerId` field to link users to Stripe customers

### Subscription Table
- `id`: Primary key
- `userId`: Foreign key to user
- `stripeSubscriptionId`: Stripe's subscription ID
- `stripePriceId`: Current price/plan ID
- `status`: Current subscription status
- `currentPeriodEnd`: When current billing period ends
- `cancelAtPeriodEnd`: Whether subscription will cancel at period end

## Implementation Flow

### Subscription Lifecycle
1. **Initiation**:
   - User selects subscription plan
   - Checkout session created
   - User redirected to Stripe Checkout

2. **Checkout Completion**:
   - Checkout session completed
   - Subscription created but payment processing
   - No premium access yet

3. **Payment Confirmation**:
   - Invoice paid event received
   - ONLY NOW grant premium access
   - Update subscription status

4. **Cancellation Handling**:
   - Option 1: User cancels for end of period
     - Update subscription with cancel_at_period_end=true
     - Keep premium access until period end
   - Option 2: Immediate cancellation
     - Subscription deleted
     - Immediate removal of premium access

5. **Renewal Process**:
   - Invoice created before period end
   - If payment succeeds: extend subscription
   - If payment fails: start dunning process

## Implementation Phases

1. **Setup Phase**
   - Install Stripe SDK
   - Configure Stripe webhook endpoint with appropriate secret
   - Update database schema

2. **Core Implementation**
   - Implement StripeService with checkout and portal methods
   - Create API routes for checkout and portal session creation
   - Implement webhook handler with event routing

3. **Testing**
   - Test subscription creation flow with Stripe test mode
   - Test webhook handling with Stripe CLI webhook forwarding
   - Verify subscription state changes correctly reflect in database

4. **Production Preparation**
   - Set up proper error handling and logging
   - Implement idempotency for webhook processing
   - Implement retry mechanism for critical operations
   - Create monitoring for webhook processing failures
   - Document the subscription lifecycle for the team
