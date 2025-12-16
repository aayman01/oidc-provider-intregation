"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [email, setEmail] = useState("alex.master@example.com");
  const [password, setPassword] = useState("User@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) {
      setError("No interaction UID found");
      return;
    }

    setLoading(true);

    // Use a form submission instead of fetch to allow natural redirects
    const form = e.target as HTMLFormElement;
    form.action = `/oidc/interaction/${uid}/login`;
    form.method = "POST";
    form.submit();
  };

  if (!uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <p className="text-red-600">No interaction UID found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex w-full max-w-md flex-col gap-6 py-10 px-8 bg-white shadow-lg rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sign In</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your credentials to continue
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded break-all">
          UID: {uid}
        </div>
      </main>
    </div>
  );
}
