import { useEffect } from 'react';
import { json, redirect } from "@remix-run/node";
import { useNavigate, useFetcher } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import ImportCSV from "~/components/ImportCSV";
import ExampleCSVDownload from "~/components/ExampleCSVDownload";
import { db } from '~/db/index';
import { createCsvImportService } from '~/lib/services/csvImportService';
import { createFileStorageService } from '~/lib/services/fileStorageService';
import { zfd } from 'zod-form-data';
import { createGameService } from '~/lib/services/gameService';
import { getAuth } from '@clerk/remix/ssr.server';
import { createLocalFileStorageService } from '~/lib/services/localFileService';
import { env } from '~/lib/env';

export const meta: MetaFunction = () => {
  return [
    { title: "Import Flashcards - Lernmemo App" },
  ];
};

// Check for authentication same as in dashboard
export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
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

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const csvService = createCsvImportService(db)
  const localFileService = createLocalFileStorageService()
  const fileService = createFileStorageService(
    {
      endpoint: env.R2_ENDPOINT,
      bucketName: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    }
  );

  const validation = actionSchema.safeParse(await args.request.formData());
  if (!validation.success) return { status: 400, json: validation.error };

  const { language, file, quickGame } = validation.data;
  const tmpFilePath = await fileService.saveCSV(userId, file);
  const csvFile = await localFileService.toString(file);
  const resultImprot = await csvService.importTranslationsFromCsv(csvFile, tmpFilePath, userId, language);

  if (quickGame === "true") {
    // Use GameService to create a new game
    const gameService = createGameService(db);
    try {
      const result = await gameService.createGame(resultImprot.attachment.attachmentId, userId, DEFAULT_VALUES.cards, DEFAULT_VALUES.questions);
      return json({ gameId: result.gameId });
    } catch (error) {
      return json({ errors: 'Failed to create game' }, { status: 500 });
    }
  }

  return redirect("/dashboard/review");
};

export default function ImportPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ gameId: string }>();
  const isSubmitting = fetcher.state !== 'idle';

  // Add useEffect for navigation after form submission completes
  useEffect(() => {
    if (fetcher.data?.gameId) {
      navigate(`/dashboard/game/${fetcher.data.gameId}`);
      return
    }
    if (fetcher.state === 'idle' && fetcher.data && !fetcher.data?.gameId) {
      navigate('/dashboard');
      return;
    }
  }, [fetcher.data, fetcher.state]);

  const handleImportSubmit = async (language: string, file: File, quickGame: boolean) => {
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
      action: "/dashboard/import"
    });
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
