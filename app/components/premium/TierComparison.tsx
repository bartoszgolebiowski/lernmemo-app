import { Form } from "@remix-run/react";
import { USAGE_THRESHOLDS } from "~/lib/services/premiumAccessService";

interface TierComparisonProps {
  isPremium: boolean;
}

export function TierComparison({ isPremium }: TierComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 max-w-4xl mx-auto">
      {/* Free Tier */}
      <div className="col-span-1">
        <div className={`rounded-lg border p-6 h-full flex flex-col shadow-sm relative border-gray-300 bg-white`}>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Free Tier</h3>
          <div className="text-2xl font-bold mb-4 text-gray-900">$0 <span className="text-base font-normal text-gray-600">/month</span></div>
          <ul className="space-y-3 flex-1 mb-6">
            <li className="text-gray-800">
              <span className="font-normal">{USAGE_THRESHOLDS['freemium'].IMAGE_IMPORT}</span> image imports per day
            </li>
            <li className="text-gray-800">
              <span className="font-normal">{USAGE_THRESHOLDS['freemium'].CSV_IMPORT}</span> CSV imports per day
            </li>
            <li className="text-gray-800">
              <span className="font-normal">{USAGE_THRESHOLDS['freemium'].CREATE_GAME}</span> games created per day
            </li>
          </ul>
          {isPremium && (
            <Form action="/api/stripe/portal" method="post">
              <button
                type="submit"
                className="w-full py-2 px-4 border border-blue-300 text-blue-800 rounded-md font-medium text-center shadow-md ring-1 ring-blue-200 transition-shadow"
              >
                Manage Subscription
              </button>
            </Form>
          )}
          {!isPremium && (
            <button disabled className="w-full py-2 px-4 border border-blue-300 text-blue-800 rounded-md font-medium text-center shadow-md ring-1 ring-blue-200 transition-shadow cursor-not-allowed">
              Your Current Plan
            </button>
          )}
        </div>
      </div>

      {/* Premium Tier */}
      <div className="col-span-1">
        <div className={`rounded-lg border p-6 h-full flex flex-col shadow-sm relative border-blue-300 bg-white`}>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Premium Tier</h3>
          <div className="text-2xl font-bold mb-4 text-gray-900">$5 <span className="text-base font-normal text-gray-600">/month</span></div>
          <ul className="space-y-3 flex-1 mb-6">
            <li className="text-gray-800">
              <span className="font-medium">{USAGE_THRESHOLDS['premium'].IMAGE_IMPORT}</span> image imports per day
            </li>
            <li className="text-gray-800">
              <span className="font-medium">{USAGE_THRESHOLDS['premium'].CSV_IMPORT}</span> CSV imports per day
            </li>
            <li className="text-gray-800">
              <span className="font-medium">{USAGE_THRESHOLDS['premium'].CREATE_GAME}</span> games created per day
            </li>
          </ul>

          {isPremium ? (
            <Form action="/api/stripe/portal" method="post">
              <button
                type="submit"
                className="w-full py-2 px-4 border border-blue-300 text-blue-800 rounded-md font-medium text-center shadow-md ring-1 ring-blue-200 transition-shadow"
              >
                Manage Subscription
              </button>
            </Form>
          ) : (
            <Form action="/api/stripe/checkout" method="post">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Upgrade to Premium
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
