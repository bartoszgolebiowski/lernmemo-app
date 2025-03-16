import React from "react";
import { Form } from "@remix-run/react";

interface QuickReviewPanelProps {
  error?: string;
}

export function QuickReviewPanel({ error }: QuickReviewPanelProps) {
  return (
    <div className="bg-blue-50 border-2 border-blue-600 overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-blue-800 truncate">
          Quick Review
        </dt>
        <dd className="mt-1 text-3xl font-semibold text-blue-800">
          Random Cards
        </dd>
        <p className="mt-1 text-sm text-blue-700">
          Start immediately with latest flashcards
        </p>
        {error === 'No attachment found' && (
          <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">
              You don't have any flashcards yet. Please import some using the options below.
            </p>
          </div>
        )}
      </div>
      <div className="bg-blue-100 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <Form method="post">
            <button 
              type="submit" 
              className="inline-flex items-center font-medium text-blue-600 hover:text-blue-500"
            >
              Start Quick Review <span aria-hidden="true">&rarr;</span>
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
