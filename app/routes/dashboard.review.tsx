import { json, redirect } from "@remix-run/node";
import { useNavigate, Form, useLoaderData } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { auth } from '~/lib/auth.server';
import { db } from '~/db/index';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import { createAttachmentService } from "~/lib/services/attachmentService";
import { createGameService } from "~/lib/services/gameService";

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
  const attachments = await attachmentSservice.getUserAttachments(userId);

  return json({
    attachments,
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
    return redirect(`/dashboard/games/${result.gameId}`);
  } catch (error) {
    return json({ errors: 'Failed to create game' }, { status: 500 });
  }
};

export default function ReviewPage() {
  const { attachments } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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
              <div className="mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Select Attachment
                </span>
                {attachments.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            File Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attachments.map((attachment) => (
                          <tr key={attachment.attachmentId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input 
                                type="radio" 
                                id={attachment.attachmentId} 
                                name="attachmentId" 
                                value={attachment.attachmentId}
                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <label htmlFor={attachment.attachmentId} className="block text-sm font-medium text-gray-700 cursor-pointer">
                                {attachment.fileLocation.split('/').pop()}
                              </label>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(attachment.importedAt!).toLocaleString()}
                            </td>
                          </tr>
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

              <div className="mb-4">
                <label htmlFor="cards" className="block text-sm font-medium text-gray-700">
                  Number of Cards
                </label>
                <input
                  type="number"
                  id="cards"
                  name="cards"
                  defaultValue={20}
                  min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="questions" className="block text-sm font-medium text-gray-700">
                  Number of Questions
                </label>
                <input
                  type="number"
                  id="questions"
                  name="questions"
                  defaultValue={50}
                  min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={attachments.length === 0}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Review
              </button>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
