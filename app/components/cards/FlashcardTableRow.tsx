import React from 'react';

export type FlashcardRowData = {
  id: string;
  word: string;
  translation: string;
  isDeleted?: boolean;
};

type RowErrors = {
  word?: string;
  translation?: string;
};

type FlashcardTableRowProps = {
  row: FlashcardRowData;
  index: number;
  isLastRow: boolean;
  errors: RowErrors;
  onChange: (index: number, field: "word" | "translation", value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: "word" | "translation") => void;
  onRemove: (index: number) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
};

export function FlashcardTableRow({
  row,
  index,
  isLastRow,
  errors,
  onChange,
  onKeyDown,
  onRemove,
  inputRef
}: FlashcardTableRowProps) {
  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="px-2 py-2">
        <div className="relative">
          <input
            type="text"
            value={row.word}
            onChange={(e) => onChange(index, "word", e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index, "word")}
            ref={isLastRow ? inputRef : null}
            placeholder="Enter word"
            className={`block w-full px-3 py-2 text-gray-700 rounded-md border ${errors.word ? 'border-red-300' : 'border-gray-300 focus:border-indigo-500'
              } focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors duration-200`}
            aria-invalid={errors.word ? "true" : "false"}
          />
          {errors.word && (
            <div className="mt-1 text-xs text-red-600" id={`word-error-${index}`}>
              {errors.word}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="relative">
          <input
            type="text"
            value={row.translation}
            onChange={(e) => onChange(index, "translation", e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index, "translation")}
            placeholder="Enter translation"
            className={`block w-full px-3 py-2 text-gray-700 rounded-md border ${errors.translation ? 'border-red-300' : 'border-gray-300 focus:border-indigo-500'
              } focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors duration-200`}
            aria-invalid={errors.translation ? "true" : "false"}
          />
          {errors.translation && (
            <div className="mt-1 text-xs text-red-600" id={`translation-error-${index}`}>
              {errors.translation}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className={"inline-flex items-center px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"}
          aria-label="Remove row"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="black">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
