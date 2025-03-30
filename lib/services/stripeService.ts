import Stripe from "stripe";
import { DrizzleDatabase } from "~/db/index";
import {
  userStripeMapping,
  subscription,
  subscriptionEventTypes,
  subscriptionPlans,
  type SubscriptionEventType,
} from "~/db/schema/subscription";
import { eq, like, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Service for handling Stripe operations
 */
export class StripeService {
  constructor(private db: DrizzleDatabase, private stripe: Stripe) {}

  /**
   * Get or create a Stripe customer for the given user
   * @param userId The user's ID
   * @param email Optional email for new customer creation
   * @returns The Stripe customer ID
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    // Check if the user already has a Stripe customer ID
    const existingMapping = await this.db
      .select()
      .from(userStripeMapping)
      .where(eq(userStripeMapping.userId, userId))
      .limit(1);

    if (existingMapping.length > 0) {
      return existingMapping[0].stripeCustomerId;
    }

    // Create a new Stripe customer
    const customer = await this.stripe.customers.create({
      metadata: {
        userId,
      },
    });

    // Save the mapping
    await this.db.insert(userStripeMapping).values({
      userId,
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription purchase
   * @param userId The user's ID
   * @param priceId The Stripe price ID
   * @param successUrl URL to redirect after successful checkout
   * @param cancelUrl URL to redirect if checkout is canceled
   * @param email Optional user email
   * @returns The checkout session with URL
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    // Get or create a customer
    const customerId = await this.getOrCreateCustomer(userId);

    // Create a checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
    });

    // Store the checkout session event
    const subscriptionGroupId = uuidv4();
    await this.db.insert(subscription).values({
      userId,
      eventType: subscriptionEventTypes.CHECKOUT_COMPLETED,
      subscriptionGroupId,
      metadata: JSON.stringify({
        sessionId: session.id,
        priceId,
        customerId,
        createdAt: new Date().toISOString(),
      }),
    });

    return {
      url: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Handle Stripe webhook events
   * @param payload The raw payload from Stripe
   * @param signature The signature header from Stripe
   * @param webhookSecret The webhook secret for verification
   * @returns The processed event
   */
  async handleWebhookEvent(
    payload: string,
    signature: string,
    webhookSecret: string
  ) {
    // Verify the event
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    this.handleWebhook(event);

    return event;
  }

  /**
   * Handle the webhook event based on its type
   * @param event The Stripe event
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await this.handleInvoicePaymentSucceeded(event);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionCanceled(event);
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }
  }

  /**
   * Handle invoice.payment_succeeded event
   * @param event The Stripe event
   */
  private async handleInvoicePaymentSucceeded(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    // Only process subscription invoices
    if (!invoice.subscription) {
      return;
    }

    // Get the subscription details
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    // Find the customer
    const mapping = await this.db
      .select()
      .from(userStripeMapping)
      .where(eq(userStripeMapping.stripeCustomerId, invoice.customer as string))
      .limit(1);

    if (mapping.length === 0) {
      console.error(`No user found for Stripe customer ${invoice.customer}`);
      return;
    }

    // Get the current period end
    const currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    );

    // Determine if this is the first invoice or a renewal
    const isFirstInvoice = invoice.billing_reason === "subscription_create";

    const eventType: SubscriptionEventType = isFirstInvoice
      ? subscriptionEventTypes.SUBSCRIPTION_CREATED
      : subscriptionEventTypes.SUBSCRIPTION_RENEWED;

    // Find the subscription group ID or create a new one
    let subscriptionGroupId: string;

    if (!isFirstInvoice) {
      // Find existing subscription group ID for this Stripe subscription
      const existingSubs = await this.db
        .select()
        .from(subscription)
        .where(like(subscription.metadata, `%${stripeSubscription.id}%`))
        .orderBy(desc(subscription.createdAt))
        .limit(1);

      if (existingSubs.length > 0) {
        subscriptionGroupId = existingSubs[0].subscriptionGroupId;
      } else {
        // Fallback - create a new group ID
        subscriptionGroupId = uuidv4();
      }
    } else {
      // For new subscriptions, create a new group ID
      subscriptionGroupId = uuidv4();
    }

    // Determine the plan type based on price ID
    // This is a simplification - you'd need to map Stripe price IDs to your plan types
    const plan = subscriptionPlans.MONTHLY;

    // Insert the subscription event
    await this.db.insert(subscription).values({
      userId: mapping[0].userId,
      eventType,
      plan,
      expiresAt: currentPeriodEnd.toISOString(),
      subscriptionGroupId,
      metadata: JSON.stringify({
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: invoice.lines.data[0]?.price?.id,
        stripeInvoiceId: invoice.id,
        status: stripeSubscription.status,
        createdAt: new Date().toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      }),
    });
  }

  /**
   * Handle customer.subscription.updated event
   * @param event The Stripe event
   */
  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const stripeSubscription = event.data.object as Stripe.Subscription;

    // Find the customer
    const mapping = await this.db
      .select()
      .from(userStripeMapping)
      .where(
        eq(
          userStripeMapping.stripeCustomerId,
          stripeSubscription.customer as string
        )
      )
      .limit(1);

    if (mapping.length === 0) {
      console.error(
        `No user found for Stripe customer ${stripeSubscription.customer}`
      );
      return;
    }

    // Find existing subscription group ID for this Stripe subscription
    const existingSubs = await this.db
      .select()
      .from(subscription)
      .where(like(subscription.metadata, `%${stripeSubscription.id}%`))
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    if (existingSubs.length === 0) {
      console.error(
        `No subscription found for Stripe subscription ${stripeSubscription.id}`
      );
      return;
    }

    // Insert the subscription updated event
    await this.db.insert(subscription).values({
      userId: mapping[0].userId,
      eventType: subscriptionEventTypes.SUBSCRIPTION_UPDATED,
      subscriptionGroupId: existingSubs[0].subscriptionGroupId,
      metadata: JSON.stringify({
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        updatedAt: new Date().toISOString(),
      }),
    });
  }

  /**
   * Handle customer.subscription.deleted event
   * @param event The Stripe event
   */
  private async handleSubscriptionCanceled(event: Stripe.Event) {
    const stripeSubscription = event.data.object as Stripe.Subscription;

    // Find the customer
    const mapping = await this.db
      .select()
      .from(userStripeMapping)
      .where(
        eq(
          userStripeMapping.stripeCustomerId,
          stripeSubscription.customer as string
        )
      )
      .limit(1);

    if (mapping.length === 0) {
      console.error(
        `No user found for Stripe customer ${stripeSubscription.customer}`
      );
      return;
    }

    // Find existing subscription group ID for this Stripe subscription
    const existingSubs = await this.db
      .select()
      .from(subscription)
      .where(like(subscription.metadata, `%${stripeSubscription.id}%`))
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    if (existingSubs.length === 0) {
      console.error(
        `No subscription found for Stripe subscription ${stripeSubscription.id}`
      );
      return;
    }

    // Insert the subscription canceled event
    await this.db.insert(subscription).values({
      userId: mapping[0].userId,
      eventType: subscriptionEventTypes.SUBSCRIPTION_CANCELED,
      subscriptionGroupId: existingSubs[0].subscriptionGroupId,
      metadata: JSON.stringify({
        stripeSubscriptionId: stripeSubscription.id,
        canceledAt: new Date().toISOString(),
      }),
    });
  }

  /**
   * Create a customer portal session
   * @param userId The user's ID
   * @param returnUrl URL to return to after the portal session
   * @returns The portal session with URL
   */
  async createCustomerPortalSession(userId: string, returnUrl: string) {
    // Get the customer ID
    const mapping = await this.db
      .select()
      .from(userStripeMapping)
      .where(eq(userStripeMapping.userId, userId))
      .limit(1);

    if (mapping.length === 0) {
      throw new Error(`No Stripe customer found for user ${userId}`);
    }

    // Create the portal session
    const session = await this.stripe.billingPortal.sessions.create({
      customer: mapping[0].stripeCustomerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  }
}

/**
 * Factory function to create the Stripe service
 * @param db The database connection
 * @returns A new StripeService instance
 */
export const createStripeService = (db: DrizzleDatabase, stripe: Stripe) => {
  return new StripeService(db, stripe);
};
