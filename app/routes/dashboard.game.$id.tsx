import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useEffect, useReducer, useRef } from "react";
import { auth } from '~/lib/auth.server';
import { db } from '~/db/index';
import { createGameService } from "~/lib/services/gameService";
import { gameActions, gameReducer, initialize } from "~/reducers/gameReducer";
import { z } from "zod";

export const meta: MetaFunction = () => {
  return [
    { title: "Flashcard Game - Lernmemo App" },
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

    if (!game) {
      throw redirect("/dashboard/review");
    }

    return json({
      game: {
        ...game,
        cards,
        answers
      }
    });
  } catch (error) {
    throw redirect("/dashboard/review");
  }
};

const actionSchema = z.array(z.object({
  translationId: z.string().uuid(),
  selectedTranslationId: z.string().uuid(),
}));

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const gameId = params.id;
  if (!gameId) return json({ error: "Game ID is required" }, { status: 400 });

  const formData = await request.formData();
  const answersString = formData.get("answers") as string;
  if (!answersString) return json({ error: "Answers are required" }, { status: 400 });

  const answers = actionSchema.safeParse(JSON.parse(answersString));
  if (!answers.success) {
    return json({ error: answers.error }, { status: 400 });
  }

  const gameService = createGameService(db);
  await gameService.submitAnswers(gameId, answers.data);

  return json({ success: true });
}

export default function GamePage() {
  const { game } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [gameState, dispatch] = useReducer(gameReducer, initialize(game.cards, game.questions));
  const fetcher = useFetcher();
  const answerQueueRef = useRef<Array<{
    translationId: string;
    selectedTranslationId: string;
  }>>([]);

  // Submit answers periodically
  useEffect(() => {
    const submitInterval = setInterval(() => {
      const answerQueue = answerQueueRef.current;

      if (answerQueue.length > 0) {
        fetcher.submit(
          { answers: JSON.stringify(answerQueue) },
          {
            method: "post",
          }
        );
      }

      answerQueueRef.current = [];
    }, 10000);

    return () => {
      answerQueueRef.current = [];
      clearInterval(submitInterval);
    };
  }, []);

  const handleAnswerSelection = (translation: string) => {
    dispatch(gameActions.selectAnswer(translation));

    // Add answer to queue
    if (gameState.currentTranslationId) {
      answerQueueRef.current.push({
        translationId: gameState.currentTranslationId!,
        selectedTranslationId: gameState.currentTranslationId! // You need to get the actual translation ID here
      });
    }

    // Reset selections after delay
    setTimeout(() => {
      dispatch(gameActions.resetSelection());
      dispatch(gameActions.refreshCards(
        game.cards,
        game.questions
      ));
      // Check if game is completed
      if (gameState.questionCount + 1 >= game.questions) {
        navigate("/dashboard/summary/" + game.gameId, { replace: true });
      }
    }, 1000);
  };

  const getAnswerButtonClassName = (translation: string) => {
    const baseClasses = "p-4 rounded-md text-lg transition";

    if (gameState.selectedTranslation === null) {
      return `${baseClasses} bg-gray-50 hover:bg-gray-100 text-gray-800`;
    }

    if (translation === gameState.correctAnswer) {
      return `${baseClasses} bg-green-600 text-white`;
    }

    if (translation === gameState.selectedTranslation) {
      return `${baseClasses} bg-red-600 text-white`;
    }

    return `${baseClasses} bg-gray-50 text-gray-800`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Flashcard Game</h1>
            <p className="mt-1 text-sm text-gray-500">
              Select the correct translation
            </p>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>

            <div className="text-right">
              <p className="text-sm text-gray-500">Questions: {gameState.questionCount} / {game.questions}</p>
              <p className="text-sm font-semibold">Score: {gameState.score}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            {/* Question word */}
            <div className="mb-8 p-6 bg-indigo-50 rounded-lg text-center">
              <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Translate this word:</h2>
              <p className="text-3xl font-bold text-indigo-700">{gameState.currentQuestion}</p>
            </div>

            {/* Possible answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gameState.possibleAnswers.map((translation) => (
                <button
                  key={translation}
                  onClick={() => handleAnswerSelection(translation)}
                  disabled={gameState.selectedTranslation !== null}
                  className={getAnswerButtonClassName(translation)}
                >
                  {translation}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
