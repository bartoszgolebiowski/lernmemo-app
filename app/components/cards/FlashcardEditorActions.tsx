import React from 'react';

type FlashcardEditorActionsProps = {
  addRow: () => void;
  onCancel: () => void;
  isPending: boolean;
  isFormValid: boolean;
};

export function FlashcardEditorActions({
  addRow,
  onCancel,
  isPending,
  isFormValid
}: FlashcardEditorActionsProps) {
  return (
    <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row sm:justify-between">
      <div className="mb-4 sm:mb-0">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Word
        </button>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !isFormValid}
          className={`inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors
            ${isFormValid ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
