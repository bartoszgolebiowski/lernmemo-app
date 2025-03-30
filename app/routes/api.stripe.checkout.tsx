import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { getServiceProvider } from "~/lib/services";
import { db } from "~/db/index";
import { env } from "~/lib/env";

export async function action(args: ActionFunctionArgs) {
  // Only allow POST requests
  if (args.request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId } = await getAuth(args);

    if (!userId) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the origin from headers to construct return URL
    const origin = args.request.headers.get("origin") || "";
    const returnUrl = `${origin}/api/stripe/success`;
    const successUrl = `${returnUrl}?success=true`;
    const cancelUrl = `${returnUrl}?cancel=true`;
    const services = getServiceProvider(db);

    const { url } = await services.stripeService.createCheckoutSession(
      userId,
      env.STRIPE_PRICE_ID,
      successUrl,
      cancelUrl
    );

    if (!url) {
      return json({ error: "Failed to create checkout session" }, { status: 500 });
    }
    return redirect(url);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// Prevent CSRF protection for this endpoint
export const headers = () => ({
  "Cache-Control": "no-store",
});
