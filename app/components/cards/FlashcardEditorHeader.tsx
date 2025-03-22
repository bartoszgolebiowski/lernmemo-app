import React from 'react';

export function FlashcardEditorHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900">Edit Words and Translations</h1>
      <p className="mt-1 text-sm text-gray-500">
        Update the words and their translations below. Press Tab at the end of a row to add a new one.
      </p>
    </div>
  );
}
