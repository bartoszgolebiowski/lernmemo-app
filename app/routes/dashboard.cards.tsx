import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { db } from "~/db/index";
import { createAttachmentService } from "~/lib/services/attachmentService";
import { ImportSection } from "~/components/dashboard/ImportSection";
import React, { useState } from 'react';
import { getAuth } from "@clerk/remix/ssr.server";

export const meta: MetaFunction = () => {
  return [{ title: "Manage Cards - Lernmemo App" }];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  // Get all attachments for the user
  const attachmentService = createAttachmentService(db);
  const attachments = await attachmentService.getUserAttachments(userId);

  return json({
    attachments: attachments.map(attachment => ({
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
  });
};

const toggleActionSchema = zfd.formData({
  attachmentId: zfd.text(z.string().uuid()),
})

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const formData = await args.request.formData();
  const validation = toggleActionSchema.safeParse(formData);

  if (!validation.success) {
    return json({ success: false, message: "Invalid form data" }, { status: 400 });
  }

  const attachmentService = createAttachmentService(db);

  try {
    // Verify the attachment belongs to the user before deleting
    const attachment = await attachmentService.getAttachmentByIdAndUserId(validation.data.attachmentId, userId);

    if (attachment && attachment.userId === userId) {
      await attachmentService.toggleDeactivationAttachment(validation.data.attachmentId, userId);
      return json({ success: true, message: "Attachment toggled successfully" });
    } else {
      return json({ success: false, message: "Unauthorized or attachment not found" }, { status: 403 });
    }

  } catch (error) {
    return json({ success: false, message: "An error occurred" }, { status: 500 });
  }
};

export default function ManageCardsPage() {
  const { attachments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
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
    <main className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Manage Your Flashcards</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all your imported flashcard sets. You can see details of each set,
            temporarily disable sets you don't need right now, or add new cards through our import options.
          </p>


        </div>

        <div className="flex justify-between items-center mb-6 flex-wrap">
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
            className="mt-8"
          />
        </div>

        {actionData?.message && (
          <div className={`p-4 mb-4 rounded-md ${actionData.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {actionData.message}
          </div>
        )}

        {attachments && attachments.length > 0 ? (
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                        <React.Fragment key={attachment.id}>
                          <tr className={!attachment.isActive ? "bg-gray-100" : ""}>
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
                              <div className="flex justify-end gap-2">
                                <Form method="post">
                                  <input type="hidden" name="attachmentId" value={attachment.id} />
                                  <button
                                    type="submit"
                                    className={`inline-flex items-center px-3 py-1.5 rounded-md ${attachment.isActive
                                      ? "bg-orange-100 text-orange-700 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                      : "bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                      }`}
                                  >
                                    <span className="mr-1">
                                      {attachment.isActive ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 01-7.5 0" />
                                      </svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                      </svg>}
                                    </span>
                                  </button>
                                </Form>
                                <button
                                  onClick={() => toggleExpand(attachment.id)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                  <span className="mr-1">
                                    {expandedAttachments.has(attachment.id) ? "▼" : "▶"}
                                  </span>
                                  {expandedAttachments.has(attachment.id) ? "Hide" : "View"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedAttachments.has(attachment.id) && (
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
                                            {translation.word}
                                          </td>
                                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {translation.translation}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
              className="mt-8"
            />
          </>
        )}
      </div>
    </main>
  );
}
