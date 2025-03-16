import { useState, useEffect } from 'react';
import { json, redirect } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import ImportImage from '~/components/ImportImage';
import { createGeminiService } from '~/lib/services/imageToCsvService';
import { createFileStorageService } from '~/lib/services/fileStorageService';
import { createCsvImportService } from '~/lib/services/csvImportService';
import { db } from '~/db/index';
import { auth } from '~/lib/auth.server';
import { zfd } from 'zod-form-data';
import { createGameService } from '~/lib/services/gameService';

export const meta: MetaFunction = () => {
  return [
    { title: "Import Flashcards from Image - Lernmemo App" },
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
  const aiService = createGeminiService();
  const fileServie = createFileStorageService();
  const csvService = createCsvImportService(db)

  const validation = actionSchema.safeParse(await request.formData());
  if (!validation.success) return { status: 400, json: validation.error };

  const { language, file, quickGame } = validation.data;

  const tmpFilePath = await fileServie.saveToTemp(file);
  const text = await aiService.imageToText(tmpFilePath, language)
  const csvText = await aiService.textToCsvFormat(text)
  const resultImprot = await csvService.importTranslationsFromCsv(csvText, file.name, userId, language);
  if (quickGame === "true") {
    // Use GameService to create a new game
    const gameService = createGameService(db);
    try {
      const result = await gameService.createGame(resultImprot.attachment.attachmentId, userId, DEFAULT_VALUES.cards, DEFAULT_VALUES.questions);
      return new Response(JSON.stringify({ gameId: result.gameId }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to create game',
      }), { status: 500 });
    }
  } else {
    return new Response(null, { status: 204 });
  }
};

export default function ImportImagePage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ gameId?: string }>();
  const isSubmitting = fetcher.state !== 'idle';

  // Add useEffect for navigation after form submission completes
  useEffect(() => {
    if (fetcher.data?.gameId) {
      navigate(`/dashboard/game/${fetcher.data.gameId}`);
      return;
    }
    if (fetcher.state === 'idle' && fetcher.data && !fetcher.data?.gameId) {
      navigate('/dashboard');
      return
    }
  }, [fetcher.data, fetcher.state]);

  const handleImportSubmit = async (language: string, file: File, quickGame: boolean) => {

    // Create FormData to send the file to the server
    const formData = new FormData();
    formData.append("language", language);
    formData.append("file", file);
    if (quickGame) {
      formData.append("quickGame", "true");
    }

    // Use fetcher.submit instead of raw fetch
    fetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data",
      action: "/dashboard/image"
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Import Flashcards from Image</h1>
            <p className="mt-1 text-sm text-gray-500">Upload an image containing words you want to learn</p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>

          <ImportImage onSubmit={handleImportSubmit} />

          {isSubmitting && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">Processing your image, please wait...</p>
            </div>
          )}

          <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Image Upload Instructions</h3>
            <p className="mb-2">For best results when extracting words from images:</p>
            <ul className="list-disc pl-5 mb-4 text-sm text-gray-600">
              <li>Use clear, high-resolution images</li>
              <li>Make sure text is clearly visible and not blurry</li>
              <li>Avoid images with complex backgrounds</li>
              <li>Supported formats: JPEG, PNG</li>
            </ul>
            <p className="text-sm text-gray-600">
              After uploading, our system will analyze the image and extract words. You will have a chance to review
              and edit the extracted words before adding them to your flashcard collection.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
