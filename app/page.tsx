"use client";

import { useState, useEffect } from "react";

// Helper to generate PKCE values
function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  randomValues.forEach((v) => {
    result += charset[v % charset.length];
  });
  return result;
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [discoveryInfo, setDiscoveryInfo] = useState<any>(null);
  const [introspectionResult, setIntrospectionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tokens from sessionStorage on mount
  useEffect(() => {
    const storedTokens = sessionStorage.getItem("tokens");
    if (storedTokens) {
      try {
        setTokens(JSON.parse(storedTokens));
      } catch (err) {
        console.error("Failed to parse stored tokens:", err);
      }
    }
  }, []);

  // 1. Start Authorization Flow
  const startAuthFlow = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate PKCE values
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await sha256(codeVerifier);

      // Store code verifier for later use
      sessionStorage.setItem("code_verifier", codeVerifier);

      // Redirect to authorization endpoint
      const params = new URLSearchParams({
        client_id: "partner-dashboard-local-2",
        redirect_uri: "http://localhost:3000/auth/callback",
        scope: "openid profile email offline_access",
        response_type: "code",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: generateRandomString(16),
      });

      window.location.href = `/oidc/auth?${params.toString()}`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 2. Get User Info
  const getUserInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = sessionStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found. Please exchange code first.");
      }

      const response = await fetch("/oidc/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("Failed to get user info");
      }

      const userData = await response.json();
      setUserInfo(userData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Refresh Token
  const refreshAccessToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const refreshToken = sessionStorage.getItem("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token found.");
      }

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "partner-dashboard-local-2",
      });

      const response = await fetch("/oidc/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const tokenData = await response.json();
      setTokens(tokenData);
      sessionStorage.setItem("access_token", tokenData.access_token);
      if (tokenData.refresh_token) {
        sessionStorage.setItem("refresh_token", tokenData.refresh_token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Get Discovery Info
  const getDiscoveryInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/oidc/.well-known/openid-configuration");
      if (!response.ok) {
        throw new Error("Failed to get discovery info");
      }

      const data = await response.json();
      setDiscoveryInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Introspect Token
  const introspectToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = sessionStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found.");
      }

      const params = new URLSearchParams({
        token: accessToken,
        client_id: "partner-dashboard-local-2",
      });

      const response = await fetch("/oidc/introspection", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error("Token introspection failed");
      }

      const data = await response.json();
      setIntrospectionResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Revoke Token
  // const revokeToken = async () => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const accessToken = sessionStorage.getItem("access_token");
  //     if (!accessToken) {
  //       throw new Error("No access token found.");
  //     }

  //     const params = new URLSearchParams({
  //       token: accessToken,
  //       client_id: "partner-dashboard-local-2",
  //     });

  //     const response = await fetch("/oidc/revocation", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //       body: params.toString(),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Token revocation failed");
  //     }

  //     alert("Token revoked successfully");
  //     sessionStorage.clear();
  //     setTokens(null);
  //     setUserInfo(null);
  //   } catch (err: any) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const revokeToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const refreshToken = sessionStorage.getItem("refresh_token");

      if (!refreshToken) {
        throw new Error("No refresh token found.");
      }

      const params = new URLSearchParams({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: "partner-dashboard-local-2",
      });

      const response = await fetch("/oidc/token/revocation", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      // RFC 7009: success == 200
      if (!response.ok) {
        throw new Error("Token revocation failed");
      }

      // Local cleanup
      sessionStorage.clear();
      setTokens(null);
      setUserInfo(null);
      setIntrospectionResult(null);

      alert("Refresh token revoked successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 7. Logout
  const logout = () => {
    const idToken = tokens?.id_token;

    // 🔥 Clear client-side auth state immediately
    sessionStorage.clear();
    setTokens(null);
    setUserInfo(null);
    setIntrospectionResult(null);

    const logoutUrl = new URL("http://localhost:4001/oidc/session/end");

    logoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      "http://localhost:3000"
    );

    if (idToken) {
      logoutUrl.searchParams.set("id_token_hint", idToken);
    }

    // Optional but recommended
    logoutUrl.searchParams.set("state", crypto.randomUUID());

    window.location.href = logoutUrl.toString();
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              OIDC Test Client
            </h1>
            <p className="text-gray-600">
              Test all OIDC authentication endpoints
            </p>
          </div>
          <div className="">
            {tokens ? (
              <div className="flex items-center gap-3 bg-green-100 text-green-800 px-4 py-2 rounded-full shadow">
                <span className="text-base font-medium">Authenticated</span>

                <button
                  onClick={logout}
                  className="ml-2 text-base bg-red-600 text-white px-3 py-2 font-semibold rounded-full hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={startAuthFlow}
                className="bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 text-base font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Authorization Flow */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">1. Authorization</h2>
            <button
              onClick={startAuthFlow}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Start Auth Flow
            </button>
          </div>

          {/* Token Exchange - Now Automatic */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">2. Token Exchange</h2>
            <p className="text-sm text-gray-600 mb-2">
              {tokens
                ? "✓ Tokens received automatically"
                : "Complete login flow first"}
            </p>
            {tokens && (
              <div className="text-xs text-green-600 font-medium">
                Access token stored
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">3. User Info</h2>
            <button
              onClick={getUserInfo}
              disabled={loading}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Get User Info
            </button>
          </div>

          {/* Refresh Token */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">4. Refresh Token</h2>
            <button
              onClick={refreshAccessToken}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Refresh Token
            </button>
          </div>

          {/* Discovery */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">5. Discovery</h2>
            <button
              onClick={getDiscoveryInfo}
              disabled={loading}
              className="w-full bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 disabled:opacity-50"
            >
              Get Discovery Info
            </button>
          </div>

          {/* Introspection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">6. Introspection</h2>
            <button
              onClick={introspectToken}
              disabled={loading}
              className="w-full bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-50"
            >
              Introspect Token
            </button>
          </div>

          {/* Revocation */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">7. Revoke Token</h2>
            <button
              onClick={revokeToken}
              disabled={loading}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Revoke Token
            </button>
          </div>

          {/* Logout */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">8. Logout</h2>
            <button
              onClick={logout}
              disabled={loading || !tokens}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tokens */}
          {tokens && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">Tokens</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(tokens, null, 2)}
              </pre>
            </div>
          )}

          {/* User Info */}
          {userInfo && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">User Info</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Discovery Info */}
          {discoveryInfo && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">Discovery Info</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(discoveryInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Introspection Result */}
          {introspectionResult && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">
                Introspection Result
              </h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(introspectionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
