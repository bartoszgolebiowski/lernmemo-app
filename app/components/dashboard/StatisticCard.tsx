import React from "react";

interface StatisticCardProps {
  title: string;
  mainValue: number;
  mainLabel: string;
  secondaryValue: number | null;
  secondaryLabel: string;
  linkText: string;
  linkHref: string;
}

export function StatisticCard({
  title,
  mainValue,
  mainLabel,
  secondaryValue,
  secondaryLabel,
  linkText,
  linkHref,
}: StatisticCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">
          {title}
        </dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">
          {mainValue} <span className="text-lg text-gray-500">{mainLabel}</span>
        </dd>
        <dd className="mt-1 text-xl font-medium text-gray-600">
          {secondaryValue !== null ? (
            <>
              {secondaryValue} <span className="text-sm text-gray-500">{secondaryLabel}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">{secondaryLabel}</span>
          )}
        </dd>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <a href={linkHref} className="inline-flex items-center font-medium text-blue-600 hover:text-blue-500">
            {linkText} <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
