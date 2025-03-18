import { useState } from "react";
import { ModalDialog } from "./ModalDialog";

interface CSVPreviewProps {
  csvUrl: string;
  fileName?: string;
  translations: Array<{ word: string | undefined; translation: string | undefined }>;
}

export function CSVPreview({ csvUrl, fileName = "CSV file", translations }: CSVPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* CSV icon/button */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="w-8 h-10 flex items-center justify-center bg-gray-100 rounded border border-gray-300">
          <span className="text-xs font-bold text-gray-500">CSV</span>
        </div>
        <span className="ml-2 text-sm text-blue-500 hover:text-blue-700 hover:underline">View</span>
      </div>

      {/* Modal */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`CSV Preview: ${fileName}`}
        className="max-w-3xl"
      >
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
              {translations.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                    {row.word}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                    {row.translation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <a
            href={csvUrl}
            download={fileName}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Download CSV
          </a>
        </div>
      </ModalDialog>
    </>
  );
}
