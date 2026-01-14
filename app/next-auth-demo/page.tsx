"use client";

import SessionProvider from "@/components/SessionProvider";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

function AuthStatus() {
  const { data: session, status } = useSession();
  console.log("this is the session", session);
  if (status === "loading") {
    return <div className="p-4">Loading session...</div>;
  }

  if (session) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold text-green-600">
          Authenticated via NextAuth!
        </h1>
        <div className="bg-gray-100 p-4 rounded border">
          <p>
            <strong>User:</strong> {session.user?.name}
          </p>
          <p>
            <strong>Email:</strong> {session.user?.email}
          </p>
          <p>
            <strong>ID:</strong> {session.user?.id}
          </p>
          <p className="mt-2 text-sm text-gray-500 break-all">
            <strong>Access Token:</strong> {session.accessToken}
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">
        NextAuth Integration Test
      </h1>
      <p>You are currently not signed in.</p>

      <button
        onClick={() => signIn("vlife")}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Sign in with VLife
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-white">
        <AuthStatus />
      </div>
    </SessionProvider>
  );
}
