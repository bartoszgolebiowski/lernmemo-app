import React from 'react';

type BackButtonProps = {
  onClick: () => void;
  label?: string;
};

export function BackButton({ onClick, label = "Back to Cards" }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      aria-label={label}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      {label}
    </button>
  );
}
