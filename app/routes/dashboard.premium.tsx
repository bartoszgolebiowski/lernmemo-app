import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db } from "db/index";
import { getServiceProvider } from "~/lib/services";
import { USAGE_THRESHOLDS } from "~/lib/services/premiumAccessService";
import { TierComparison } from "~/components/premium/TierComparison";

// Fetch user data including subscription and usage statistics
async function getUserData(userId: string) {
  const services = getServiceProvider(db);

  // Determine if user is premium
  const isPremium = await services.subscriptionService.isPremium(userId);
  const usageAndLimits = await services.premiumAccessService.getRemainingActions(userId, isPremium);

  return {
    isPremium,
    usageAndLimits,
  };
}

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/signin");
  }

  const userData = await getUserData(userId);
  return json(userData);
}

export default function PremiumPage() {
  const { isPremium, usageAndLimits } = useLoaderData<typeof loader>();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Subscription & Usage</h1>

      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Your Usage</h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span>Image Imports</span>
              <span>{usageAndLimits.IMAGE_IMPORT} / {USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].IMAGE_IMPORT}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    (usageAndLimits.IMAGE_IMPORT / USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].IMAGE_IMPORT) * 100,
                    100
                  )}%`
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>CSV Imports</span>
              <span>{usageAndLimits.CSV_IMPORT} / {USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].CSV_IMPORT}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    (usageAndLimits.CSV_IMPORT / USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].CSV_IMPORT) * 100,
                    100
                  )}%`
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Games Created</span>
              <span>{usageAndLimits.CREATE_GAME} / {USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].CREATE_GAME}</span>

            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    (usageAndLimits.CREATE_GAME / USAGE_THRESHOLDS[isPremium ? "premium" : "freemium"].CREATE_GAME) * 100,
                    100
                  )}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <TierComparison isPremium={isPremium} />


    </div>
  );
}
