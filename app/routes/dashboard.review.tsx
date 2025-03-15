import { json, redirect } from "@remix-run/node";
import { useNavigate, Form, useLoaderData } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { auth } from '~/lib/auth.server';
import { db } from '~/db/index';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { createAttachmentService } from "~/lib/services/attachmentService";
import { createGameService } from "~/lib/services/gameService";
import { createCsvImportService } from "~/lib/services/csvImportService";
import React, { useState } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: "Review Flashcards - Lernmemo App" },
  ];
};

// Check for authentication same as in dashboard
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;
  const attachmentSservice = createAttachmentService(db);
  const importService = createCsvImportService(db);
  const attachments = await attachmentSservice.getUserAttachments(userId);
  const translationsForAttachments = attachments.map(async (attachment) =>
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

  return json({
    attachmentsWithTranslations,
  })
};

const actionSchema = zfd.formData({
  cards: zfd.numeric(z.number().positive()),
  questions: zfd.numeric(z.number().positive()),
  attachmentId: zfd.text(z.string().uuid()),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  // Validate user session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;

  // Process form data
  const formData = await request.formData();
  const validation = actionSchema.safeParse(formData);

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
};

const DEFAULT_VALUES = {
  cards: 10,
  questions: 20,
} as const;

export default function ReviewPage() {
  const { attachmentsWithTranslations } = useLoaderData<typeof loader>();
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

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" id="cards" name="cards" value={DEFAULT_VALUES.cards} />
              <input type="hidden" id="questions" name="questions" value={DEFAULT_VALUES.questions} />
              <div className="mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Select Attachment
                </span>
                {attachmentsWithTranslations.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

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
                                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                  Start Review
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
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(attachment.attachmentId)}
                                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                  aria-label={expandedAttachments.has(attachment.attachmentId) ? 'Hide Flashcards' : 'Show Flashcards'}
                                >
                                  {expandedAttachments.has(attachment.attachmentId) ? 'Hide 🔼' : 'Expand 🔽'}
                                </button>
                              </td>
                            </tr>
                            {expandedAttachments.has(attachment.attachmentId) && (
                              <>
                                <tr>
                                  <td colSpan={4} className="px-6 py-4">
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
                                  <td colSpan={4} className="px-6 py-4 text-center bg-gray-50">
                                    <button
                                      type="submit"
                                      name="attachmentId"
                                      value={attachment.attachmentId}
                                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
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
