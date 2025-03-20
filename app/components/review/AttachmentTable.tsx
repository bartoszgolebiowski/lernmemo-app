import React from 'react';

type Translation = {
  flashcard_import: {
    attachmentId: string | null;
    translationId: string | null;
  };
  flashcard_translation: {
    translationId: string;
    word: string;
    translation: string;
    targetLanguage: string;
  } | null;
};

type Attachment = {
  attachmentId: string;
  translationCardCount: number;
  targetLanguage: string;
  importedAt: string;
  translations: Translation[];
};

type Props = {
  attachments: Attachment[];
  expandedAttachments: Set<string>;
  selectedAttachments: Set<string>;
  toggleExpand: (id: string) => void;
  toggleAttachment: (id: string) => void;
};

export const AttachmentTable = ({
  attachments,
  expandedAttachments,
  selectedAttachments,
  toggleExpand,
  toggleAttachment,
}: Props) => {
  const renderAttachmentRow = (attachment: Attachment) => (
    <React.Fragment key={attachment.attachmentId}>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <label
            className={`inline-flex items-center p-2 rounded-md transition-colors cursor-pointer ${selectedAttachments.has(attachment.attachmentId)
              ? "bg-green-100 border border-green-600"
              : "bg-white hover:bg-gray-100 border border-gray-300"
              }`}
          >
            <input
              type="checkbox"
              name="attachmentIds"
              value={attachment.attachmentId}
              checked={selectedAttachments.has(attachment.attachmentId)}
              onChange={() => toggleAttachment(attachment.attachmentId)}
              className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded-md shadow-sm cursor-pointer"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">Select Set</span>
          </label>
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
            type='button'
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
        <tr>
          <td colSpan={5} className="px-6 py-4 bg-gray-50">
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Word</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Translation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attachment.translations.map((translation, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{translation.flashcard_translation?.word}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{translation.flashcard_translation?.translation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  return (
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
          {attachments.map(renderAttachmentRow)}
        </tbody>
      </table>
    </div>
  );
};
