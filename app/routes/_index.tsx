import { SignedIn, UserButton, SignOutButton, SignedOut, SignInButton, SignUpButton } from "@clerk/remix";
import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Lernmemo - Language Learning Made Easy" },
    { name: "description", content: "Enhance your language learning with Lernmemo's smart flashcard system" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">Lernmemo</div>
        <div className="flex gap-4">
          <a href="https://lernmemo.com" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
            Main Site
          </a>
          <a href="https://blog.lernmemo.com" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
            Blog
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center text-gray-800">
          Welcome to Lernmemo
        </h1>
        <p className="text-xl text-center text-gray-600 max-w-2xl mx-auto mb-12">
          Your intelligent language learning companion that makes vocabulary acquisition effortless
        </p>
        
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="py-8 px-8">
            <SignedIn>
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Welcome Back!</h3>
                <p className="text-gray-700 mb-6">
                  Ready to continue your language learning journey? Access your flashcards and track your progress.
                </p>
                <div className="flex justify-center mb-6">
                  <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md">
                    Go to Dashboard
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-500">Your profile:</p>
                  <UserButton />
                  <SignOutButton>
                    <button className="text-red-600 hover:text-red-800 font-medium">
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Join Lernmemo Today</h3>
                <p className="text-gray-700 mb-6">
                  Create your account to start your language learning journey with our smart flashcard system.
                </p>
                <div className="space-y-4">
                  <SignUpButton>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
                      Sign Up
                    </button>
                  </SignUpButton>
                  <div className="flex items-center justify-center">
                    <div className="border-t border-gray-300 flex-grow mr-3"></div>
                    <span className="text-gray-500 text-sm">or</span>
                    <div className="border-t border-gray-300 flex-grow ml-3"></div>
                  </div>
                  <SignInButton>
                    <button className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md">
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              </div>
            </SignedOut>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-blue-700">Master Any Language</h2>
            <p className="text-gray-700 mb-4">
              Lernmemo uses spaced repetition science to optimize your vocabulary learning. Our smart flashcard system
              adapts to your progress, helping you memorize words and phrases efficiently.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Personalized learning paths</li>
              <li>Intelligent review schedules</li>
              <li>Multiple languages supported</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-blue-700">Why Lernmemo?</h2>
            <p className="text-gray-700 mb-4">
              Traditional language learning methods often fail because they don't account for how your brain forms and
              retains memories. Lernmemo's algorithm ensures you review words at the optimal moment -
              not too soon, not too late.
            </p>
            <div className="flex justify-center mt-6">
              <Link to="/about" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more about our method →
              </Link>
            </div>
          </div>
        </div>


      </main>

      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-600 mb-4 md:mb-0">© 2025 Lernmemo. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="https://lernmemo.com" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
              lernmemo.com
            </a>
            <a href="https://blog.lernmemo.com" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
              Blog
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


