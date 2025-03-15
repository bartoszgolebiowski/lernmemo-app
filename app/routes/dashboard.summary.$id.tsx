import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { auth } from '~/lib/auth.server';
import { db } from '~/db/index';
import { createGameService } from "~/lib/services/gameService";

export const meta: MetaFunction = () => {
  return [
    { title: "Game Summary - Lernmemo App" },
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // Authentication check
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;
  const gameId = params.id;

  if (!gameId) {
    return redirect("/dashboard/review");
  }

  // Fetch game data
  const gameService = createGameService(db);
  try {
    const game = await gameService.getGameById(gameId, userId);
    if (!game) {
      throw redirect("/dashboard/review");
    }

    const [cards, answers] = await Promise.all([
      gameService.getTranslationsByGameId(game.gameId),
      gameService.getAnswersByGameId(game.gameId)
    ]);

    // Calculate statistics
    const correctAnswers = answers.filter(answer =>
      cards.find(card => card.translationId === answer.translationId)?.translation ===
      cards.find(card => card.translationId === answer.selectedTranslationId)?.translation
    ).length;

    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return json({
      game: {
        ...game,
        cards,
        answers,
        statistics: {
          correctAnswers,
          totalQuestions,
          accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
        }
      }
    });
  } catch (error) {
    throw redirect("/dashboard/review");
  }
};

export default function Summary() {
  const { game } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  console.log({ game })
  return (

    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Game Summary</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review your performance
            </p>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>

            <button
              onClick={() => navigate("/dashboard/review")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Play Again
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Results</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-sm text-gray-500">Final Score</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {game.statistics.correctAnswers} / {game.statistics.totalQuestions}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-sm text-gray-500">Accuracy</p>
                  <p className="text-2xl font-bold text-indigo-600">{game.statistics.accuracy}%</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4">Answer Review</h2>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Question</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Your Answer</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Correct Answer</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {game.answers.map((answer, index) => {
                  const questionCard = game.cards.find(card => card.translationId === answer.translationId);
                  const answerCard = game.cards.find(card => card.translationId === answer.selectedTranslationId);
                  const isCorrect = questionCard?.translation === answerCard?.translation;

                  return (
                    <tr key={index}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {questionCard?.word}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {answerCard?.translation}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {questionCard?.translation}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {isCorrect ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Incorrect
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div >

        </div>
      </main >
    </div >

  );
}
