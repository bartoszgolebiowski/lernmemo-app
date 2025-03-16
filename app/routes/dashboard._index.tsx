import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/db/index";
import { auth } from "~/lib/auth.server";
import { createStatisticsService } from "~/lib/services/statisticsService";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - Lernmemo App" },
  ];
};

// This is a placeholder for actual auth checking
// You would replace this with your actual auth logic
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;
  const username = session.user.name;
  const email = session.user.email;

  // Get real user statistics using the statistics service
  const statisticsService = createStatisticsService(db);
  const stats = await statisticsService.getUserStats(userId);

  return json({
    user: {
      name: username,
      email: email,
    },
    stats
  });
};

export default function Dashboard() {
  const { user, stats } = useLoaderData<typeof loader>();

  return (
    <main className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
          <p className="mt-1 text-sm text-gray-500">Here s your learning progress</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Cards count panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Cards reviewed today
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.cardsToReview}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <a href="/dashboard/review" className="font-medium text-blue-600 hover:text-blue-500">
                  Start Review <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>

          {/* Cards learned panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Flaschards available
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.cardsLearned}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <a href="/dashboard/cards" className="font-medium text-blue-600 hover:text-blue-500">
                  View Flaschards <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>

          {/* Streak panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Current Streak
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.streakDays} days
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <a href="/dashboard/stats" className="font-medium text-blue-600 hover:text-blue-500">
                  View Stats <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>



        {/* Import from Image Section */}
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Take a Picture
            </h3>
            <a
              href="/dashboard/image"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Lets do it!
            </a>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              Extract vocabulary directly from textbooks, articles, or any image containing text.
              Our system will analyze the image and create flashcards from the detected words.
            </p>
          </div>
        </div>

        {/* New Import Flashcards Section */}
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Import with CSV
            </h3>
            <a
              href="/dashboard/import"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload CSV
            </a>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              Import your flashcards from CSV files to quickly build your learning deck.
              Supported formats include language learning vocabulary lists with term and definition columns.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
