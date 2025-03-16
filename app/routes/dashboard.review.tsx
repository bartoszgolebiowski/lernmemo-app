import { json, redirect } from "@remix-run/node";
import { useNavigate, Form, useLoaderData } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { db } from '~/db/index';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { createAttachmentService } from "~/lib/services/attachmentService";
import { createGameService } from "~/lib/services/gameService";
import { createCsvImportService } from "~/lib/services/csvImportService";
import React, { useState } from 'react';
import { getAuth } from "@clerk/remix/ssr.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Review Flashcards - Lernmemo App" },
  ];
};

// Check for authentication same as in dashboard
export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Get uncompleted games
  const gameService = createGameService(db);
  const attachmentSservice = createAttachmentService(db);
  const importService = createCsvImportService(db);
  const attachments = await attachmentSservice.getActiveUserAttachments(userId);
  const uncompletedGames = await gameService.getUncompletedGames(userId);
  const translationsForAttachments = attachments.map((attachment) =>
    importService.getTranslationsFromAttachment(attachment.attachmentId)
  );

  const translations = await Promise.all(translationsForAttachments);

  const attachmentsWithTranslations = attachments.map((attachment, index) => ({
    ...attachment,
    importedAt: new Date(attachment.importedAt!).toLocaleString(),
    translations: translations[index],
    translationCardCount: translations[index].length,
    targetLanguage: translations[index][0].flashcard_translation?.targetLanguage ?? 'Unknown',
  }));

  const uncompletedGamesWithStringDate = uncompletedGames.map((game) => ({
    ...game,
    createdAt: new Date(game.createdAt!).toLocaleString(),
  }))

  return json({
    uncompletedGames: uncompletedGamesWithStringDate,
    attachmentsWithTranslations,
  })
};

const startReviewSchema = zfd.formData({
  cards: zfd.numeric(z.number().positive()),
  questions: zfd.numeric(z.number().positive()),
  attachmentId: zfd.text(z.string().uuid()),
});

const closeReviewSchema = zfd.formData({
  gameId: zfd.text(z.string().uuid()),
});

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Process form data
  const formData = await args.request.formData();
  const type = formData.get('type');

  if (type === 'start') {
    const validation = startReviewSchema.safeParse(formData);

    if (!validation.success) {
      return json({ errors: validation.error.format() }, { status: 400 });
    }

    const { cards, questions, attachmentId } = validation.data;

    // Use GameService to create a new game
    const gameService = createGameService(db);
    try {
      const result = await gameService.createGame(attachmentId, userId, cards, questions);
      return redirect(`/dashboard/game/${result.gameId}`);
    } catch (error) {
      return json({ errors: 'Failed to create game' }, { status: 500 });
    }
  }

  if (type === 'close') {
    const validation = closeReviewSchema.safeParse(formData);

    if (!validation.success) {
      return json({ errors: validation.error.format() }, { status: 400 });
    }

    const { gameId } = validation.data;

    // Use GameService to close the game
    const gameService = createGameService(db);
    try {
      await gameService.completeGame(gameId);
      return json({ success: true });
    } catch (error) {
      return json({ errors: 'Failed to close game' }, { status: 500 });
    }
  }

  return json({ errors: 'Invalid action type' }, { status: 400 });
};

export default function ReviewPage() {
  const { uncompletedGames, attachmentsWithTranslations } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());

  const toggleExpand = (attachmentId: string) => {
    setExpandedAttachments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attachmentId)) {
        newSet.delete(attachmentId);
      } else {
        newSet.add(attachmentId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Review Flashcards</h1>
            <p className="mt-1 text-sm text-gray-500">Configure your review session</p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Uncompleted Games Section */}
          {uncompletedGames && uncompletedGames.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Continue Uncompleted Reviews</h2>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Review
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Close
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uncompletedGames.map((game) => (
                      <tr key={game.gameId} className="hover:bg-gray-50">
                        <td align="left" className="px-6 py-4 whitespace-nowrap text-left">
                          <button
                            onClick={() => navigate(`/dashboard/game/${game.gameId}`)}
                            className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Continue
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {game.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Form method="post">
                            <input type="hidden" name="type" value="close" />
                            <input type="hidden" name="gameId" value={game.gameId} />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" id="type" name="type" value="start" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Cards Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Cards Per Review</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select how many flashcards will be included in your review session.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[10, 20, 30].map((value) => (
                      <label key={`cards-${value}`} className="relative cursor-pointer" aria-label={`Select ${value} cards`}>
                        <input
                          type="radio"
                          className="sr-only peer"
                          name="cards"
                          value={value}
                          defaultChecked={value === 10}
                        />
                        <div className="w-16 h-16 flex items-center justify-center rounded-lg 
                                      bg-white border-2 border-gray-200 text-gray-500
                                      peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700
                                      hover:bg-gray-50 transition-all duration-200">
                          <span className="text-lg font-medium">{value}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Questions Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Questions to Complete</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select how many questions you need to answer to complete the review.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[10, 20, 30, 50].map((value) => (
                      <label key={`questions-${value}`} className="relative cursor-pointer" aria-label={`Select ${value} questions`}>
                        <input
                          type="radio"
                          className="sr-only peer"
                          name="questions"
                          value={value}
                          defaultChecked={value === 20}
                        />
                        <div className="w-16 h-16 flex items-center justify-center rounded-lg 
                                      bg-white border-2 border-gray-200 text-gray-500
                                      peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700
                                      hover:bg-gray-50 transition-all duration-200">
                          <span className="text-lg font-medium">{value}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <span className="block text-lg font-medium text-gray-900 mb-4">
                  Select Flashcard Set
                </span>
                {attachmentsWithTranslations.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Review
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Flashcards Count
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Language
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded At
                          </th>
                          <th align="right" scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Show Flashcards
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attachmentsWithTranslations.map((attachment) => (
                          <React.Fragment key={attachment.attachmentId}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  type="submit"
                                  name="attachmentId"
                                  value={attachment.attachmentId}
                                  disabled={attachmentsWithTranslations.length === 0}
                                  className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                  </svg>
                                  Start
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {attachment.translationCardCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {attachment.targetLanguage}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {attachment.importedAt}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => toggleExpand(attachment.attachmentId)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                  <span className="mr-1">
                                    {expandedAttachments.has(attachment.attachmentId) ? "▼" : "▶"}
                                  </span>
                                  {expandedAttachments.has(attachment.attachmentId) ? "Hide" : "View"}
                                </button>
                              </td>
                            </tr>
                            {expandedAttachments.has(attachment.attachmentId) && (
                              <>
                                <tr>
                                  <td colSpan={5} className="px-6 py-4">
                                    <div className="border rounded-md overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Word
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Translation
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {attachment.translations.map((translation, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {translation.flashcard_translation?.word}
                                              </td>
                                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {translation.flashcard_translation?.translation}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={5} className="px-6 py-4 text-center bg-gray-50">
                                    <button
                                      type="submit"
                                      name="attachmentId"
                                      value={attachment.attachmentId}
                                      className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                      Start Review with this Set
                                    </button>
                                  </td>
                                </tr>
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">No attachments found. Please upload some flashcards first.</p>
                  </div>
                )}
              </div>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
