import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useState, useEffect } from "react";
import { auth } from '~/lib/auth.server';
import { db } from '~/db/index';
import { createGameService } from "~/lib/services/gameService";

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
    const cards = await gameService.getTranslationsByGameId(game.gameId);
    if (!game) {
      throw redirect("/dashboard/review");
    }

    return json({
      game: {
        ...game,
        cards
      }
    });
  } catch (error) {

    throw redirect("/dashboard/review");

  }
};

export default function GamePage() {
  const { game } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [currentCards, setCurrentCards] = useState<Array<{ word: string, translation: string }>>([]);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [completedWords, setCompletedWords] = useState<string[]>([]);

  // Initialize and refresh cards when needed
  useEffect(() => {
    if (game && game.cards) {
      refreshCardSet();
    }
  }, [game, questionCount]);

  const refreshCardSet = () => {
    if (!game?.cards) return;

    // Filter out already completed cards
    const availableCards = game.cards.filter(card => !completedWords.includes(card.word!));

    // Randomly select 5 cards (or fewer if less are available)
    const shuffled = [...availableCards].sort(() => 0.5 - Math.random());
    const newSet = shuffled.slice(0, 5);

    setCurrentCards(newSet);
  };

  // Separate and shuffle words and translations
  const words = currentCards.map(card => card.word);
  const translations = [...currentCards.map(card => card.translation)]
    .sort(() => 0.5 - Math.random());

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
    if (selectedTranslation) {
      checkAnswer(word, selectedTranslation);
    }
  };

  const handleTranslationClick = (translation: string) => {
    setSelectedTranslation(translation);
    if (selectedWord) {
      checkAnswer(selectedWord, translation);
    }
  };

  const checkAnswer = (word: string, translation: string) => {
    const matchingCard = currentCards.find(card => card.word === word);
    const isCorrect = matchingCard && matchingCard.translation === translation;

    setFeedback(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setScore(prev => prev + 1);
      setCompletedWords(prev => [...prev, word]);

      // Reset selections after a brief delay
      setTimeout(() => {
        setSelectedWord(null);
        setSelectedTranslation(null);
        setFeedback(null);
        setQuestionCount(prev => prev + 1);

        // Check if game is completed
        if (questionCount + 1 >= game.questions) {
          navigate("/dashboard");
        }
      }, 1000);
    } else {
      // Reset selections after showing incorrect feedback
      setTimeout(() => {
        setSelectedWord(null);
        setSelectedTranslation(null);
        setFeedback(null);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Flashcard Game</h1>
            <p className="mt-1 text-sm text-gray-500">
              Match the words with their translations
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
              <p className="text-sm text-gray-500">Questions: {questionCount} / {game.questions}</p>
              <p className="text-sm font-semibold">Score: {score}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            {feedback && (
              <div
                className={`mb-4 p-3 text-center text-lg font-medium rounded ${feedback === "correct"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}
              >
                {feedback === "correct" ? "Correct!" : "Incorrect, try again!"}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Words column */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Words</h3>
                <div className="space-y-3">
                  {words.map((word) => {
                    const isCompleted = completedWords.includes(word);
                    return (
                      <button
                        key={word}
                        onClick={() => handleWordClick(word)}
                        disabled={isCompleted}
                        className={`w-full p-4 rounded-md transition ${selectedWord === word
                          ? "bg-indigo-600 text-white"
                          : isCompleted
                            ? "bg-gray-100 text-gray-400"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                          }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Translations column */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Translations</h3>
                <div className="space-y-3">
                  {translations.map((translation) => {
                    const matchingCard = currentCards.find(card => card.translation === translation);
                    const isCompleted = matchingCard && completedWords.includes(matchingCard.word);

                    return (
                      <button
                        key={translation}
                        onClick={() => handleTranslationClick(translation)}
                        disabled={isCompleted}
                        className={`w-full p-4 rounded-md transition ${selectedTranslation === translation
                          ? "bg-indigo-600 text-white"
                          : isCompleted
                            ? "bg-gray-100 text-gray-400"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                          }`}
                      >
                        {translation}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
