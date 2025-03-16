import { useState } from 'react';
import { json, redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import ImportCSV from "~/components/ImportCSV";
import ExampleCSVDownload from "~/components/ExampleCSVDownload";
import { db } from '~/db/index';
import { auth } from '~/lib/auth.server';
import { createCsvImportService } from '~/lib/services/csvImportService';
import { createFileStorageService } from '~/lib/services/fileStorageService';
import { zfd } from 'zod-form-data';
import { createGameService } from '~/lib/services/gameService';

export const meta: MetaFunction = () => {
  return [
    { title: "Import Flashcards - Lernmemo App" },
  ];
};

// Check for authentication same as in dashboard
export const loader = async () => {
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    return redirect("/login");
  }

  return json({});
};

const actionSchema = zfd.formData({
  language: zfd.text(),
  file: zfd.file(),
  quickGame: zfd.text().optional(),
});

const DEFAULT_VALUES = {
  cards: 10,
  questions: 20,
} as const;

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  if (!session) return redirect("/login");

  const userId = session.user.id;
  const csvService = createCsvImportService(db)
  const fileService = createFileStorageService();

  const validation = actionSchema.safeParse(await request.formData());
  if (!validation.success) return { status: 400, json: validation.error };

  const { language, file } = validation.data;
  const csvFile = await fileService.toString(file);
  const resultImprot = await csvService.importTranslationsFromCsv(csvFile, file.name, userId, language);

  if (validation.data.quickGame === "true") {
    // Use GameService to create a new game
    const gameService = createGameService(db);
    try {
      const result = await gameService.createGame(resultImprot.attachment.attachmentId, userId, DEFAULT_VALUES.cards, DEFAULT_VALUES.questions);
      return json({ gameId: result.gameId });
    } catch (error) {
      return json({ errors: 'Failed to create game' }, { status: 500 });
    }
  }
  return redirect("/dashboard");
};

export default function ImportPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImportSubmit = async (language: string, file: File, quickGame: boolean) => {
    setIsSubmitting(true);
    try {
      // Create FormData to send the file to the server
      const formData = new FormData();
      formData.append("language", language);
      formData.append("file", file);
      if (quickGame) {
        formData.append("quickGame", "true");
      }

      // Send the file to your backend
      const response = await fetch("/dashboard/import", {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        // Redirect to the game if quickGame is true
        const { gameId } = await response.json();
        if (gameId) {
          navigate(`/dashboard/game/${gameId}`);
        } else {
          navigate("/dashboard");
        }
      } else {
        // Handle error
        console.error("Error importing image");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Import Flashcards</h1>
            <p className="mt-1 text-sm text-gray-500">Upload a CSV file to import your flashcards</p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>

          <ImportCSV onSubmit={handleImportSubmit} />

          <div className="mt-6">
            <ExampleCSVDownload />
          </div>

          {isSubmitting && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">Processing your file, please wait...</p>
            </div>
          )}

          <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-3">CSV Format Instructions</h3>
            <p className="mb-2">Your CSV file should contain the following columns:</p>
            <ul className="list-disc pl-5 mb-4 text-sm text-gray-600">
              <li><strong>word</strong> - The word or phrase in the source language</li>
              <li><strong>translation</strong> - The translation in the target language</li>
            </ul>
            <p className="text-sm text-gray-600">
              The first row should contain the column names. Make sure your CSV file follows this format or download our example template for a ready-to-use format.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
