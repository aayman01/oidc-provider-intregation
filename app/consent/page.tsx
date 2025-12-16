"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ConsentPage() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);

  useEffect(() => {
    // You could fetch interaction details here to show what scopes are requested
    // For now, we'll use the default scopes from the URL
    setScopes(["openid", "profile", "email"]);
  }, [uid]);

  const handleConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) {
      setError("No interaction UID found");
      return;
    }

    setLoading(true);

    // Use a form submission instead of fetch to allow natural redirects
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/oidc/interaction/${uid}/consent`;
    document.body.appendChild(form);
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
          <h1 className="text-2xl font-bold text-gray-800">Grant Permission</h1>
          <p className="text-sm text-gray-500 mt-1">
            The application is requesting access to your account
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">
            This application will be able to:
          </p>
          <ul className="space-y-2">
            {scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="capitalize">{scope}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleConsent}>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? "Authorizing..." : "Authorize"}
          </button>
        </form>

        <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded break-all">
          UID: {uid}
        </div>
      </main>
    </div>
  );
}
