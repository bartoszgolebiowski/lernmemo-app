import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { SignInForm } from "~/components/SignInForm";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - Lernmemo App" },
  ];
};

export default function Login() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Login to Lernmemo</h1>
      
      <SignInForm />
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Dont have an account?{" "}
          <Link 
            to="/signup"
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
