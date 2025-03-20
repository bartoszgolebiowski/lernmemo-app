import { useEffect, useState } from "react";
import { Link, useNavigate, useFetcher } from "@remix-run/react";

interface ReviewCompleteProps {
  gameId: string;
  flashcardsCount: number; // Renamed from score
  answeredCount: number; // Renamed from totalQuestions
}

export default function ReviewComplete({ gameId, flashcardsCount, answeredCount }: ReviewCompleteProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const fetcher = useFetcher();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      navigate(`/dashboard/summary/${gameId}`);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, []);

  const handleTryAgain = () => {
    fetcher.submit({}, {
      method: "post",
      action: `/dashboard/summary/${gameId}`
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Final Score</h2>
        </div>

        <div className="mb-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">{flashcardsCount} / {answeredCount}</div>
        </div>

        <div className="mb-6 flex flex-col space-y-3">
          <button
            onClick={handleTryAgain}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition"
            disabled={fetcher.state !== "idle"}
          >
            {fetcher.state !== "idle" ? "Loading..." : "Try Again"}
          </button>
          
          <Link
            to={`/dashboard/summary/${gameId}`}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View Detailed Summary →
          </Link>
        </div>

        <div className="text-sm text-gray-500">
          Redirecting to summary in {countdown} seconds...
        </div>
      </div>
    </div>
  );
}
