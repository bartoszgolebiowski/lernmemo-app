import { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async (args: LoaderFunctionArgs) => {
  const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
  const success = searchParams.get("success");

  if (success === "true") {
    // In a real app, we might want to verify the payment here
    // but the webhook will handle the actual status update

    return new Response("", {
      status: 302,
      headers: {
        Location: "/dashboard/premium?success=true",
      },
    });
  }

  return new Response("", {
    status: 302,
    headers: {
      Location: "/dashboard/premium?canceled=true",
    },
  });
};
