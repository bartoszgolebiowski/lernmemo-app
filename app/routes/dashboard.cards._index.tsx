import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, Form, useNavigate, Link } from "@remix-run/react";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { db } from "~/db/index";
import { ImportSection } from "~/components/dashboard/ImportSection";
import { getAuth } from "@clerk/remix/ssr.server";
import { getServiceProvider } from "~/lib/services";
import { convertZodErrorsToFailResult, fail, successEmpty } from "~/lib/services/utils";
import { FeedbackNotification } from "~/components/FeedbackNotification";

export const meta: MetaFunction = () => {
  return [{ title: "Manage Cards - Lernmemo App" }];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Get all attachments for the user
  const services = getServiceProvider(db);
  const attachments = await services.attachmentService.getUserAttachments(userId);

  return {
    attachments: attachments.map((attachment) => ({
      id: attachment.attachmentId,
      wordCount: attachment.translationCount,
      targetLanguage: attachment.targetLanguage,
      createdAt: attachment.importedAt,
      isActive: !attachment.deactivatedAt,
      translations: attachment.translations.map(translation => ({
        word: translation.flashcard_translation?.word,
        translation: translation.flashcard_translation?.translation,
      }))
    }))
  };
};

const toggleActionSchema = zfd.formData({
  attachmentId: zfd.text(z.string().uuid()),
});

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const formData = await args.request.formData();
  const validation = toggleActionSchema.safeParse(formData);

  if (!validation.success) {
    return json(
      convertZodErrorsToFailResult(validation.error),
      { status: 400 });
  }
  const services = getServiceProvider(db);

  try {
    // Verify the attachment belongs to the user before deleting
    const attachment = await services.attachmentService.getAttachmentByIdAndUserId(validation.data.attachmentId, userId);

    if (attachment && attachment.userId === userId) {
      await services.attachmentService.toggleDeactivationAttachment(validation.data.attachmentId, userId);
      return json(successEmpty());
    } else {
      return json(fail("Unauthorized or attachment not found", 403), { status: 403 });
    }

  } catch (error) {
    return json(fail("An error occurred", 500), { status: 500 });
  }
};

export default function ManageCardsPage() {
  const { attachments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  return (
    <main className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manage Your Flashcards</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all your imported flashcard sets. You can see details of each set,
            temporarily disable sets you do not need right now, or add new cards through our import options.
          </p>
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
          className="my-8"
        />

        {attachments && attachments.length > 0 && (
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target Language
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Words
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Import Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attachments.map((attachment) => (
                        <tr key={attachment.id} className={!attachment.isActive ? "bg-gray-100" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link to={`/dashboard/cards/${attachment.id}`} className="text-blue-600 hover:underline">
                              View Details
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attachment.targetLanguage}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attachment.wordCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attachment.createdAt}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Form method="post">
                              <input type="hidden" name="attachmentId" value={attachment.id} />
                              <button
                                type="submit"
                                className={`inline-flex items-center px-3 py-1.5 rounded-md ${attachment.isActive
                                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                  }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="black">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
