import { ActionFunctionArgs, json } from "@remix-run/node";
import { getServiceProvider } from "~/lib/services";
import { db } from "~/db/index";
import { env } from "~/lib/env";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    // Get the raw body as text
    const payload = await request.text();

    // Use the service provider to get the stripeService
    const services = getServiceProvider(db);
    // Let the stripeService handle the webhook event verification and processing
    await services.stripeService.handleWebhookEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    return json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }
}

// Prevent CSRF protection for this endpoint
export const headers = () => ({
  "Cache-Control": "no-store",
});
