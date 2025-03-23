import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { db } from "~/db/index";
import { getServiceProvider } from "~/lib/services";
import { getAuth } from "@clerk/remix/ssr.server";

// Component imports
import { DashboardHeader } from "~/components/dashboard/DashboardHeader";
import { StatisticCard } from "~/components/dashboard/StatisticCard";
import { QuickReviewPanel } from "~/components/dashboard/QuickReviewPanel";
import { EmptyState } from "~/components/dashboard/EmptyState";
import { ImportSection } from "~/components/dashboard/ImportSection";

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

  try {
    const attachment = await services.attachmentService.getLastAttachmentByUserId(userId);
    if (!attachment) {
      return json({ errors: 'No attachment found' }, { status: 400 });
    }
    const result = await services.gameService.createGame(
      [attachment.attachmentId],
      userId,
      DEFAULT_VALUES.cards,
    );
    return redirect(`/dashboard/game/${result.gameId}`);
  } catch (error) {
    return json({ errors: 'Failed to create game' }, { status: 500 });
  }
};

const DEFAULT_VALUES = {
  cards: 10,
  questions: 20,
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
            <QuickReviewPanel error={actionData?.errors} />

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
