import React from "react";

interface DashboardHeaderProps {
  name: string;
}

export function DashboardHeader({ name }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}!</h1>
      <p className="mt-1 text-sm text-gray-500">Here's your learning progress</p>
    </div>
  );
}
