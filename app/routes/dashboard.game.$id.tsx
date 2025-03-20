import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useEffect, useReducer, useState } from "react";
import { db } from '~/db/index';
import { createGameService } from "~/lib/services/gameService";
import { gameActions, gameReducer, initialize } from "~/reducers/gameReducer";
import { z } from "zod";
import ReviewComplete from "~/components/ReviewComplete";
import { getAuth } from "@clerk/remix/ssr.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Flashcard Game - Lernmemo App" },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const gameId = args.params.id;

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
    const [cards, asnwers] = await Promise.all([
      gameService.getTranslationsByGameId(game.gameId),
      gameService.getAnswersByGameId(game.gameId),
    ]);

    if (!game) {
      throw redirect("/dashboard/review");
    }

    return json({
      game: {
        ...game,
        cards,
      },
      initialSeed: Math.floor(Math.random() * 1000),
      questionCount: asnwers.length,
      completedFlaschcards: asnwers.filter((a) => a.translationId === a.selectedTranslationId).length,
    });
  } catch (error) {
    throw redirect("/dashboard/review");
  }
};

const completedSchema = z.boolean()
const answersSchema = z.object({
  translationId: z.string().uuid(),
  selectedTranslationId: z.string().uuid(),
})

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const gameId = args.params.id;
  if (!gameId) return json({ error: "Game ID is required" }, { status: 400 });

  const formData = await args.request.formData();
  const answersString = formData.get("answers") as string;
  const completedString = formData.get("completed") as string;
  if (!answersString) return json({ error: "Answers are required" }, { status: 400 });
  if (!completedString) return json({ error: "Completed is required" }, { status: 400 });

  const answers = answersSchema.safeParse(JSON.parse(answersString));
  if (!answers.success) {
    return json({ error: answers.error }, { status: 400 });
  }

  const completed = completedSchema.safeParse(completedString === "true");
  if (!completed.success) {
    return json({ error: completed.error }, { status: 400 });
  }

  const gameService = createGameService(db);
  await gameService.submitAnswers(gameId, [answers.data]);

  if (completed.data) {
    await gameService.completeGame(gameId);
    return redirect(`/dashboard/game/${gameId}`);
  }

  return json({ success: true });
}

export default function GamePage() {
  const { game, questionCount, completedFlaschcards, initialSeed } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [gameState, dispatch] = useReducer(gameReducer, initialize(game.cards, completedFlaschcards, questionCount, initialSeed));
  const [fastMode, setFastMode] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    dispatch(gameActions.initialize(game.cards, completedFlaschcards, questionCount, initialSeed));
  }, [game.gameId]);

  const handleAnswerSelection = (translationId: string) => {
    dispatch(gameActions.selectAnswer(translationId));

    // Check if this answer will complete all words
    const isCorrectAnswer = translationId === gameState.correctAnswer;
    const willCompleteAllWords = isCorrectAnswer &&
      gameState.completedWords.length + 1 === game.cards.length;

    fetcher.submit(
      {
        completed: willCompleteAllWords,
        answers: JSON.stringify({
          translationId: gameState.correctAnswer!,
          selectedTranslationId: translationId
        }),
      },
      {
        method: "post",
      }
    );

    // Reset selections after delay based on fast mode
    setTimeout(() => {
      dispatch(gameActions.nextQuestion(
        game.cards,
        Math.floor(Math.random() * 10000),
      ));
    }, fastMode ? 100 : 1000);
  };

  const getAnswerButtonClassName = (translationId: string) => {
    const baseClasses = "p-4 rounded-md text-lg transition";


    if (!gameState.selectedTranslationId) {
      return `${baseClasses} bg-gray-50 hover:bg-gray-100 text-gray-800`;
    }

    if (gameState.correctAnswer === translationId) {
      return `${baseClasses} bg-green-600 text-white`;
    }

    if (gameState.selectedTranslationId === translationId) {
      return `${baseClasses} bg-red-600 text-white`;
    }

    return `${baseClasses} bg-gray-50 text-gray-800`;
  };

  // Check if game is completed
  if (gameState.completedWords.length === game.cards.length) {
    return <ReviewComplete
      gameId={game.gameId}
      flashcardsCount={game.cards.length}
      answeredCount={gameState.questionCount}
    />;
  }

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

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm">
                <input
                  type="checkbox"
                  id="fastMode"
                  checked={fastMode}
                  onChange={(e) => setFastMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-600">Fast Mode</span>
              </label>

              <div className="text-right">
                <p className="text-sm text-gray-500">Completed words: {gameState.completedWords.length} / {game.cards.length}</p>
              </div>
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
                  key={translation.translationId}
                  onClick={() => handleAnswerSelection(translation.translationId)}
                  disabled={!!gameState.selectedTranslationId}
                  className={getAnswerButtonClassName(translation.translationId)}
                >
                  {translation.translation}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
