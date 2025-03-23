import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { db } from "~/db/index";
import { getServiceProvider } from "~/lib/services";
import { getAuth } from "@clerk/remix/ssr.server";
import { actionTypes } from "~/db/schema/userAction";
import { fail } from "~/lib/services/utils";

// Component imports
import { DashboardHeader } from "~/components/dashboard/DashboardHeader";
import { StatisticCard } from "~/components/dashboard/StatisticCard";
import { QuickReviewPanel } from "~/components/dashboard/QuickReviewPanel";
import { EmptyState } from "~/components/dashboard/EmptyState";
import { ImportSection } from "~/components/dashboard/ImportSection";
import { FeedbackNotification } from "~/components/FeedbackNotification";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard - Lernmemo App" }];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Get services from the central provider
  const services = getServiceProvider(db);
  const stats = await services.statisticsService.getUserStats(userId);

  return json({
    stats: {
      cardsReviewedToday: stats.cardsReviewedToday,
      cardsAvailable: stats.cardsAvailable,
      cardsReviewedAllTime: stats.cardsReviewedAllTime,
    }
  });
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Use services from the central provider
  const services = getServiceProvider(db);

  // Check if the user can perform the game creation action
  const isPremium = false; // This should be fetched from your user service
  const canPerformAction = await services.premiumAccessService.canPerformAction(
    userId,
    actionTypes.CREATE_GAME,
    isPremium
  );

  if (!canPerformAction) {
    return json(
      fail("You've reached your daily limit for creating games. Upgrade to premium for higher limits.", 429),
      { status: 429 }
    );
  }

  try {
    const attachment = await services.attachmentService.getLastAttachmentByUserId(userId);
    if (!attachment) {
      return json(fail('No attachment found', 400), { status: 400 });
    }

    // Track the action
    await services.premiumAccessService.trackAction(userId, actionTypes.CREATE_GAME);

    const result = await services.gameService.createGame(
      [attachment.attachmentId],
      userId,
      DEFAULT_VALUES.cards,
    );
    return redirect(`/dashboard/game/${result.gameId}`);
  } catch (error) {
    return json(fail('Failed to create game', 500), { status: 500 });
  }
};

const DEFAULT_VALUES = {
  cards: 10,
} as const;

export default function Dashboard() {
  const { stats } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DashboardHeader />

        {stats.cardsAvailable > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <QuickReviewPanel />

            <StatisticCard
              title="Cards Reviewed"
              mainValue={stats.cardsReviewedToday}
              mainLabel="today"
              secondaryValue={stats.cardsReviewedAllTime}
              secondaryLabel="all time"
              linkText="Select Review"
              linkHref="/dashboard/review"
            />

            <StatisticCard
              title="Flashcards Available"
              mainValue={stats.cardsAvailable}
              mainLabel="total"
              secondaryValue={null}
              secondaryLabel="Manage your collection"
              linkText="View Flashcards"
              linkHref="/dashboard/cards"
            />
          </div>
        ) : (
          <EmptyState />
        )}

        {actionData?.success === false && <FeedbackNotification actionData={actionData} />}

        {/* Only show these sections if cards are available */}
        {stats.cardsAvailable > 0 && (
          <>
            <ImportSection
              title="Take a Picture"
              description="Extract vocabulary directly from textbooks, articles, or any image containing text. Our system will analyze the image and create flashcards from the detected words."
              linkText="Take a Picture"
              linkHref="/dashboard/image"
              icon="camera"
              className="mt-4"
            />

            <ImportSection
              title="Import with CSV"
              description="Import your flashcards from CSV files to quickly build your learning deck. Supported formats include language learning vocabulary lists with term and definition columns."
              linkText="Import CSV"
              linkHref="/dashboard/import"
              icon="upload"
              className="mt-8"
            />
          </>
        )}
      </div>
    </main>
  );
}
