"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle error from OIDC provider
    if (errorParam) {
      setError(`${errorParam}: ${errorDescription || "Unknown error"}`);
      return;
    }

    // Check if code exists
    if (!code) {
      setError("Authorization code missing");
      return;
    }

    // Automatically exchange code for tokens
    exchangeCodeForTokens(code);
  }, [searchParams]);

  const exchangeCodeForTokens = async (code: string) => {
    setExchanging(true);

    try {
      const codeVerifier = sessionStorage.getItem("code_verifier");
      if (!codeVerifier) {
        throw new Error(
          "Code verifier not found. Please start the auth flow from the home page."
        );
      }

      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/auth/callback",
        client_id: "partner-dashboard-local-2",
        code_verifier: codeVerifier,
      });

      const response = await fetch("/oidc/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || "Token exchange failed");
      }

      const tokenData = await response.json();

      // Store tokens
      sessionStorage.setItem("access_token", tokenData.access_token);
      sessionStorage.setItem("id_token", tokenData.id_token);
      if (tokenData.refresh_token) {
        sessionStorage.setItem("refresh_token", tokenData.refresh_token);
      }

      // Store full token response for display
      sessionStorage.setItem("tokens", JSON.stringify(tokenData));

      // Redirect back to home page
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      console.error("Token exchange error:", err);
      setError(err.message);
    } finally {
      setExchanging(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="rounded bg-white p-8 shadow-lg text-center max-w-md">
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-red-600 mb-2">
              Authentication Error
            </h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Back to Home
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              {exchanging ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              ) : (
                <svg
                  className="w-8 h-8 text-green-600"
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
              )}
            </div>
            <h1 className="text-lg font-semibold mb-2">
              {exchanging
                ? "Exchanging code for tokens..."
                : "Authentication Successful!"}
            </h1>
            <p className="text-sm text-gray-500">
              {exchanging ? "Please wait..." : "Redirecting you back..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
