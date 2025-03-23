import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigate, useNavigation, useActionData } from "@remix-run/react";
import { z } from "zod";
import { db } from "~/db/index";
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { getAuth } from "@clerk/remix/ssr.server";
import { FlashcardEditorHeader } from "~/components/cards/FlashcardEditorHeader";
import { BackButton } from "~/components/cards/BackButton";
import { FlashcardTable } from "~/components/cards/FlashcardTable";
import { FlashcardEditorActions } from "~/components/cards/FlashcardEditorActions";
import type { FlashcardRowData } from "~/components/cards/FlashcardTableRow";
import { AttachmentPreview } from "~/components/dashboard/AttachmentPreview";
import { getServiceProvider } from "~/lib/services";
import { success, fail, successEmpty, convertZodErrorsToFailResult } from "~/lib/services/utils";
import { FeedbackNotification } from "~/components/FeedbackNotification";

export const meta: MetaFunction = () => {
  return [{ title: "Edit Flashcard - Lernmemo App" }];
};

// Schema for validation
const flashcardSchema = z.object({
  rows: z.array(
    z.object({
      id: z.string().optional(),
      word: z.string().min(1, "Word is required"),
      translation: z.string().min(1, "Translation is required"),
      isDeleted: z.boolean().optional(),
    })
  ).min(1, "At least one row is required"),
});

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const flashcardId = args.params.id;
  if (!flashcardId) {
    return redirect("/dashboard/cards");
  }
  const services = getServiceProvider(db);

  // Get the flashcard using the edit service
  const flashcardData = await services.flashcardEditService.fetchFlashcardDetails(flashcardId, userId);

  if (!flashcardData) {
    return redirect("/dashboard/cards");
  }

  const presignedUrl = await services.presignedUrlService.getFile(flashcardData.fileLocation);

  return json({
    flashcard: {
      id: flashcardData.attachmentId,
      fileLocation: flashcardData.fileLocation,
      presignedUrl,
      rows: flashcardData.translations.map(t => ({
        id: t.id,
        word: t.word,
        translation: t.translation,
        targetLanguage: t.targetLanguage,
      })),
    },
  });
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  const flashcardId = args.params.id;
  if (!flashcardId) {
    return json(fail("Flashcard ID is required", 400), { status: 400 });
  }

  const formData = await args.request.formData();

  try {
    const rawRows = formData.get("tableRows")?.toString() || "[]";
    const data = { rows: JSON.parse(rawRows) };

    const validation = flashcardSchema.safeParse(data);

    if (!validation.success) {
      return json(
        convertZodErrorsToFailResult(validation.error),
        { status: 400 }
      );
    }

    const services = getServiceProvider(db);

    // First fetch the existing flashcard to verify ownership
    const existingFlashcard = await services.flashcardEditService.fetchFlashcardDetails(flashcardId, userId);
    if (!existingFlashcard) {
      return json(fail("Unauthorized or flashcard not found", 403), { status: 403 });
    }

    // Prepare translations with the word field for the service
    const updatedTranslations = validation.data.rows.map(r => ({
      id: r.id,
      word: r.word,
      translation: r.translation,
      targetLanguage: existingFlashcard.targetLanguage,
      isDeleted: r.isDeleted
    }));

    // Update the flashcard with the structured data
    await services.flashcardEditService.updateFlashcard(
      flashcardId,
      { translations: updatedTranslations },
      userId
    );

    return json(successEmpty());
  } catch (error) {
    return json(
      fail("An error occurred while updating the flashcard", 500),
      { status: 500 }
    );
  }
};

export default function EditFlashcardPage() {
  const { flashcard } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const newRowInputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const isPending = navigation.state === "submitting";
  const actionData = useActionData<typeof action>();

  // Local state for managing translations; ensure each row has a unique id:
  const [tableRows, setTableRows] = useState<FlashcardRowData[]>(
    flashcard.rows.map(row => ({ id: row.id || Date.now().toString(), ...row }))
  );

  // Handle row change with debounced update
  const handleRowChange = useCallback((index: number, field: "word" | "translation", value: string) => {
    setTableRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Add a new row with a unique id
  const addRow = useCallback(() => {
    setTableRows(prev => [...prev, { id: Date.now().toString(), word: "", translation: "" }]);
    // Focus on the new row's first input after a short delay for the DOM to update
    setTimeout(() => {
      if (newRowInputRef.current) {
        newRowInputRef.current.focus();
      }
    }, 50);
  }, []);

  // Remove a row
  const removeRow = useCallback((index: number) => {
    setTableRows(prev => prev.map((row, i) => i === index ? { ...row, isDeleted: true } : row));
  }, []);

  // Handle keyboard navigation between cells
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, field: "word" | "translation") => {
    if (e.key === 'Tab' && !e.shiftKey && field === 'translation' && index === tableRows.length - 1) {
      e.preventDefault();
      addRow();
    }
  }, [addRow, tableRows.length]);

  // Compute duplicate words
  const wordCounts = useMemo(() => {
    return tableRows.reduce((acc, row) => {
      const word = row.word.trim();
      if (word) acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tableRows]);

  // Inline errors per row: mark empty fields and duplicate words
  const getRowErrors = useCallback((row: FlashcardRowData) => {
    const errors: { word?: string; translation?: string } = {};
    if (!row.word.trim()) errors.word = "Word is required";
    if (!row.translation.trim()) errors.translation = "Translation is required";
    if (row.word.trim() && wordCounts[row.word.trim()] > 1) errors.word = "Duplicate word";
    return errors;
  }, [wordCounts]);

  // Overall form validity: every row must have non-empty fields and no duplicate errors
  const isFormValid = useMemo(() => {
    if (tableRows.length === 0) return false;
    return tableRows.every(row => {
      const errors = getRowErrors(row);
      return !errors.word && !errors.translation;
    });
  }, [tableRows, getRowErrors]);

  return (
    <main className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FlashcardEditorHeader />

        <div className="mb-6">
          <BackButton onClick={() => navigate("/dashboard/cards")} />
        </div>
        {actionData?.success === false && <FeedbackNotification actionData={actionData} />}

        {/* Add file preview section */}
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Source File</h2>
          {flashcard.fileLocation.endsWith(".csv") ? (
            <a href={flashcard.presignedUrl} download className="text-blue-600 hover:underline">
              Download imported CSV file
            </a>
          ) : (
            <AttachmentPreview
              fileUrl={flashcard.presignedUrl}
              fileLocation={flashcard.fileLocation}
            />
          )}
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Form method="post" className="divide-y divide-gray-200">
            <input type="hidden" name="tableRows" value={JSON.stringify(tableRows)} />

            <div className="overflow-x-auto">
              <FlashcardTable
                rows={tableRows}
                getRowErrors={getRowErrors}
                handleRowChange={handleRowChange}
                handleKeyDown={handleKeyDown}
                removeRow={removeRow}
                addRow={addRow}
                newRowInputRef={newRowInputRef}
              />
            </div>

            <FlashcardEditorActions
              addRow={addRow}
              onCancel={() => navigate("/dashboard/cards")}
              isPending={isPending}
              isFormValid={isFormValid}
            />
          </Form>
        </div>
      </div>
    </main>
  );
}
