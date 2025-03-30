import { SignOutButton } from '@clerk/remix';
import { Link } from '@remix-run/react';

export function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              Lernmemo
            </Link>
          </div>
          <div className="flex items-center">
            <nav className="hidden md:ml-6 md:flex space-x-4">
              <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Dashboard
              </Link>
              <Link to="/dashboard/review" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Review
              </Link>
              <Link to="/dashboard/cards" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                My Flashcards
              </Link>
              <Link to="/dashboard/premium" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Premium
              </Link>
            </nav>
            <div className="ml-4">
              <SignOutButton >
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
