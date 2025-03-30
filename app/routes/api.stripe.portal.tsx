import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db } from "~/db/index";
import { getServiceProvider } from "~/lib/services";

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
    const returnUrl = `${origin}/dashboard/premium`;

    const services = getServiceProvider(db);
    const { url } = await services.stripeService.createCustomerPortalSession(
      userId,
      returnUrl
    );

    if (!url) {
      return json({ error: "Failed to create session" }, { status: 500 });
    }
    return redirect(url);
  } catch (error) {
    console.error("Stripe portal error:", error);
    return json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    );
  }
}

// Prevent CSRF protection for this endpoint
export const headers = () => ({
  "Cache-Control": "no-store",
});
