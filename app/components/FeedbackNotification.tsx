import { Link } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { FailResult } from "~/lib/services/utils";

type ErrorDisplayProps = {
  actionData?: FailResult<string>
};

export function FeedbackNotification({ actionData }: ErrorDisplayProps) {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actionData && notificationRef.current) {
      notificationRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [actionData?.statusCode]);

  if (!actionData) return null;
  if (!actionData.statusCode) return null;

  const { error, statusCode } = actionData;

  // Usage limit error (429)
  if (statusCode === 429) {
    return (
      <div ref={notificationRef} className="rounded-md bg-yellow-50 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Usage Limit Reached</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <Link
                to="/dashboard/premium"
                className="rounded-md bg-yellow-50 px-3.5 py-2.5 text-sm font-semibold text-yellow-800 shadow-sm ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100"
              >
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Client error (400)
  if (statusCode === 400) {
    return (
      <div ref={notificationRef} className="rounded-md bg-orange-50 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">Invalid Request</h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (statusCode === 403) {
    return (
      <div ref={notificationRef} className="rounded-md bg-red-50 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Server error (500) or any other unhandled status code
  return (
    <div ref={notificationRef} className="rounded-md bg-red-50 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Server Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error || "Something went wrong. Please try again later."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
