import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Lernmemo App" },
  ];
};

export default function Index() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Welcome to Lernmemo</h1>
      
      <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="py-6 px-8">
          <p className="text-gray-700 text-lg mb-6 text-center">
            Your personal learning companion
          </p>
          
          <div className="space-y-4">
            <Link
              to="/login"
              className="block w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center transition"
            >
              Login
            </Link>
            
            <Link
              to="/signup"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded text-center transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


