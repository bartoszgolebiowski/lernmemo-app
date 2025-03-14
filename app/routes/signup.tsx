import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { SignUpForm } from "~/components/SignUpForm";

export const meta: MetaFunction = () => {
  return [
    { title: "Create Account - Lernmemo App" },
  ];
};

export default function SignUp() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Create an Account</h1>
      
      <SignUpForm />
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{" "}
          <Link 
            to="/login"
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
