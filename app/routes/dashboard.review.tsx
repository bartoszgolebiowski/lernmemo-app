import { useState } from 'react';
import { getAuth } from "@clerk/remix/ssr.server";
import { json, redirect } from "@remix-run/node";
import { useNavigate, Form, useLoaderData, useActionData } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { db } from '~/db/index';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { CardSelection } from "~/components/review/CardSelection";
import { AttachmentTable } from "~/components/review/AttachmentTable";
import { getServiceProvider } from '~/lib/services';
import { actionTypes } from "~/db/schema/userAction";
import { FeedbackNotification } from '~/components/FeedbackNotification';
import { convertZodErrorsToFailResult, fail, successEmpty } from "~/lib/services/utils";

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

  // Get services from the central provider
  const services = getServiceProvider(db);

  const attachments = await services.attachmentService.getActiveUserAttachments(userId);
  const uncompletedGames = await services.gameService.getUncompletedGames(userId);
  const translationsForAttachments = attachments.map((attachment) =>
    services.csvImportService.getTranslationsFromAttachment(attachment.attachmentId)
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
  attachmentIds: zfd.repeatable(z.array(z.string().uuid())),
});

const closeReviewSchema = zfd.formData({
  gameId: zfd.text(z.string().uuid()),
});

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const services = getServiceProvider(db);

  // Process form data
  const formData = await args.request.formData();
  const type = formData.get('type');

  if (type === 'start') {
    const validation = startReviewSchema.safeParse(formData);

    if (!validation.success) {
      return json(convertZodErrorsToFailResult(validation.error), { status: 400 });
    }

    const { cards, attachmentIds } = validation.data;

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
      );
    }

    try {
      // Track the action
      await services.premiumAccessService.trackAction(userId, actionTypes.CREATE_GAME);

      const result = await services.gameService.createGame(attachmentIds, userId, cards);
      return redirect(`/dashboard/game/${result.gameId}`);
    } catch (error) {
      return json(fail('Failed to create game', 500), { status: 500 });
    }
  }

  if (type === 'close') {
    const validation = closeReviewSchema.safeParse(formData);

    if (!validation.success) {
      return json(convertZodErrorsToFailResult(validation.error), { status: 400 });
    }

    const { gameId } = validation.data;

    try {
      await services.gameService.completeGame(gameId);
      return json(successEmpty());
    } catch (error) {
      return json(fail('Failed to close game', 500), { status: 500 });
    }
  }

  return json(fail('Invalid action type', 400), { status: 400 });
};

export default function ReviewPage() {
  const { uncompletedGames, attachmentsWithTranslations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());

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

  const toggleAttachment = (attachmentId: string) => {
    setSelectedAttachments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attachmentId)) {
        newSet.delete(attachmentId);
      } else {
        newSet.add(attachmentId);
      }
      return newSet;
    });
  };

  // Add Submit button section at the bottom of the form
  const renderSubmitButton = () => {
    if (selectedAttachments.size === 0) return null;

    return (
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          name="type"
          value="start"
          className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Start Review with Selected Sets ({selectedAttachments.size})
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
          {actionData?.success === false && <FeedbackNotification actionData={actionData} />}

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
                      <th scope="col" align="right" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <CardSelection />
              </div>

              <div className="mb-6">
                <span className="block text-lg font-medium text-gray-900 mb-4">
                  Select Flashcard Sets
                </span>
                {attachmentsWithTranslations.length > 0 ? (
                  <AttachmentTable
                    attachments={attachmentsWithTranslations}
                    expandedAttachments={expandedAttachments}
                    selectedAttachments={selectedAttachments}
                    toggleExpand={toggleExpand}
                    toggleAttachment={toggleAttachment}
                  />
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">No attachments found. Please upload some flashcards first.</p>
                  </div>
                )}
              </div>
              {renderSubmitButton()}
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
