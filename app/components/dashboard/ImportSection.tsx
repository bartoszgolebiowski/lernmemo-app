import React from "react";

interface ImportSectionProps {
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  icon: "camera" | "upload";
  className?: string;
}

export function ImportSection({
  title,
  description,
  linkText,
  linkHref,
  icon,
  className = "",
}: ImportSectionProps) {
  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {title}
        </h3>
        <a
          href={linkHref}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {icon === "camera" ? (
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          )}
          {linkText}
        </a>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <p className="text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}
