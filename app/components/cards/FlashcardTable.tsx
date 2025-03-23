import React from 'react';
import { FlashcardTableRow, FlashcardRowData } from './FlashcardTableRow';
import { EmptyStateMessage } from './EmptyStateMessage';

type FlashcardTableProps = {
  rows: FlashcardRowData[];
  getRowErrors: (row: FlashcardRowData) => { word?: string; translation?: string };
  handleRowChange: (index: number, field: "word" | "translation", value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: "word" | "translation") => void;
  removeRow: (index: number) => void;
  addRow: () => void;
  newRowInputRef: React.RefObject<HTMLInputElement>;
};

export function FlashcardTable({
  rows,
  getRowErrors,
  handleRowChange,
  handleKeyDown,
  removeRow,
  addRow,
  newRowInputRef
}: FlashcardTableProps) {
  if (rows.length === 0) {
    return <EmptyStateMessage onAddRow={addRow} />;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Word
          </th>
          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Translation
          </th>
          <th scope="col" className="relative px-2 py-2 w-12">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {rows.filter(row => !row.isDeleted).map((row, index) => (
          <FlashcardTableRow
            key={row.id}
            row={row}
            index={index}
            isLastRow={index === rows.length - 1}
            errors={getRowErrors(row)}
            onChange={handleRowChange}
            onKeyDown={handleKeyDown}
            onRemove={removeRow}
            inputRef={index === rows.length - 1 ? newRowInputRef : undefined}
          />
        ))}
      </tbody>
    </table>
  );
}
