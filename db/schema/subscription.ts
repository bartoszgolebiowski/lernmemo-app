/**
 * Subscription Schema - Using Event Sourcing Pattern
 * 
 * This file defines the schema for our subscription system using an event sourcing approach.
 * Instead of storing the current state of subscriptions in a traditional table and updating them,
 * we store every change as an immutable event. The current state is derived by replaying these events.
 * 
 * Benefits of this approach:
 * - Complete audit trail of all subscription changes
 * - Never loses historical information
 * - Makes debugging and troubleshooting easier
 * - Allows for time-travel queries (what was the state at a given point in time)
 */
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

/**
 * Available subscription plans
 * Currently we only have a monthly plan, but this can be extended
 * with yearly, quarterly, etc. as needed
 */
export const subscriptionPlans = {
  MONTHLY: "monthly",
} as const;

export type SubscriptionPlan =
  (typeof subscriptionPlans)[keyof typeof subscriptionPlans];

/**
 * Subscription event types - each represents a distinct change to a subscription
 * These event types follow the lifecycle of a subscription:
 * 1. SUBSCRIPTION_CREATED - Initial subscription creation
 * 2. SUBSCRIPTION_RENEWED - Subscription was renewed (extends expiration)
 * 3. SUBSCRIPTION_CANCELED - User actively canceled their subscription
 * 4. SUBSCRIPTION_EXPIRED - System detected subscription has reached its expiration date
 * 
 * Stripe-specific event types:
 * 5. CHECKOUT_COMPLETED - Stripe checkout process completed
 * 6. PAYMENT_SUCCEEDED - Payment was successful
 * 7. PAYMENT_FAILED - Payment failed
 * 8. PAYMENT_ACTION_REQUIRED - Additional authentication needed
 * 9. CUSTOMER_UPDATED - Customer information updated
 * 10. SUBSCRIPTION_UPDATED - Subscription details changed
 */
export const subscriptionEventTypes = {
  SUBSCRIPTION_CREATED: "SUBSCRIPTION_CREATED",
  SUBSCRIPTION_CANCELED: "SUBSCRIPTION_CANCELED",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  // Stripe-specific event types
  CHECKOUT_COMPLETED: "CHECKOUT_COMPLETED",
  SUBSCRIPTION_UPDATED: "SUBSCRIPTION_UPDATED",
} as const;

export type SubscriptionEventType =
  (typeof subscriptionEventTypes)[keyof typeof subscriptionEventTypes];

/**
 * Subscription Status Types - Reflects the Stripe subscription status
 */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid";

/**
 * Subscription Events Table (Event Store)
 * 
 * This is the core table of our event sourcing system. Each row represents an 
 * immutable event that happened to a subscription. New events are always appended,
 * and existing events are never modified.
 * 
 * Key aspects:
 * - subscriptionGroupId: Groups related events for the same subscription
 * - eventType: The type of change that occurred
 * - plan, expiresAt: Data specific to this event type
 * - metadata: JSON string for additional contextual information, including Stripe-specific data
 * 
 * To determine the current state of a subscription, we need to replay all events
 * for a subscriptionGroupId in chronological order, with later events overriding
 * earlier ones.
 */
export const subscription = sqliteTable("subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  userId: text("user_id").notNull(), // The user who owns this subscription
  eventType: text("event_type").$type<SubscriptionEventType>().notNull(), // The type of event
  // Store all relevant data in the event itself
  plan: text("plan").$type<SubscriptionPlan>(), // The subscription plan (only relevant for CREATE and RENEW events)
  expiresAt: text("expires_at"), // When the subscription expires (only relevant for CREATE and RENEW events)
  // Reference to the original subscription for grouping events
  subscriptionGroupId: text("subscription_group_id").notNull(), // Groups events related to the same subscription
  metadata: text("metadata"), // Additional JSON data including Stripe information (stripeSubscriptionId, stripePriceId, status, etc.)
  createdAt: text("created_at")
    .notNull()
    .$default(() => new Date().toISOString()), // When this event occurred
});

/**
 * User-Stripe mapping table
 * 
 * Since we don't have a user table and use external user IDs,
 * this table maintains the mapping between our user IDs and Stripe customer IDs.
 */
export const userStripeMapping = sqliteTable("user_stripe_mapping", {
  userId: text("user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$default(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$default(() => new Date().toISOString()),
});
