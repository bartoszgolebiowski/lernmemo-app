import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import { db } from "~/db/index";
import { auth } from "~/lib/auth.server";
import { createAttachmentService } from "~/lib/services/attachmentService";

export const meta: MetaFunction = () => {
  return [{ title: "Manage Cards - Lernmemo App" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validate user session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;

  // Get all attachments for the user
  const attachmentService = createAttachmentService(db);
  const attachments = await attachmentService.getAttachmentsByUserId(userId);

  return json({ 
    attachments: attachments.map(attachment => ({
      id: attachment.attachmentId,
      title: attachment.title || 'Untitled Attachment',
      wordCount: attachment.wordCount || 0,
      createdAt: attachment.createdAt,
      type: attachment.type || 'Unknown',
    }))
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Validate user session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) return redirect("/login");

  const userId = session.user.id;
  const formData = await request.formData();
  const action = formData.get("_action");
  
  const attachmentService = createAttachmentService(db);

  try {
    if (action === "delete") {
      const attachmentId = formData.get("attachmentId") as string;
      // Verify the attachment belongs to the user before deleting
      const attachment = await attachmentService.getAttachmentById(attachmentId);
      
      if (attachment && attachment.userId === userId) {
        await attachmentService.deleteAttachment(attachmentId);
        return json({ success: true, message: "Attachment deleted successfully" });
      } else {
        return json({ success: false, message: "Unauthorized or attachment not found" }, { status: 403 });
      }
    }
    return json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return json({ success: false, message: "An error occurred" }, { status: 500 });
  }
};

export default function ManageCardsPage() {
  const { attachments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  return (
    <main className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Imported Cards</h1>
          <a 
            href="/dashboard/image" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Import New Cards
          </a>
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
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
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
                        <tr key={attachment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{attachment.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {attachment.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attachment.wordCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(attachment.createdAt), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <Form method="post">
                                <input type="hidden" name="attachmentId" value={attachment.id} />
                                <button
                                  name="_action"
                                  value="delete"
                                  type="submit"
                                  onClick={() => setSelectedAttachment(attachment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </Form>
                              <a href={`/dashboard/cards/${attachment.id}`} className="text-indigo-600 hover:text-indigo-900">
                                View
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by importing some cards.</p>
            <div className="mt-6">
              <a
                href="/dashboard/image"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Import Cards
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
