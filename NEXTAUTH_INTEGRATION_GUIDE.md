# VLife OIDC - NextAuth Integration Guide

Complete guide for integrating VLife's OIDC authentication into your Next.js application using NextAuth.js.

---

## 📋 Overview

This guide demonstrates how to integrate VLife's OpenID Connect (OIDC) provider with Next.js applications using **NextAuth.js** (Auth.js). NextAuth simplifies OAuth/OIDC integration by handling session management, token refresh, and callback routing automatically.

> **Note**: This integration is **separate** from the manual PKCE flow documented in the main README. Use NextAuth for production applications requiring robust session management and automatic token refresh.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install next-auth
# or
pnpm add next-auth
# or
yarn add next-auth
```

### 2. Configure Environment Variables

Create or update your `.env.local` file:

```env
# VLife OIDC Configuration
VLIFE_CLIENT_ID=your-client-id
VLIFE_CLIENT_SECRET=your-client-secret
VLIFE_ISSUER=https://auth.vlifebiz.com/oidc

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Optional: For production
# NEXTAUTH_URL=https://yourdomain.com
```

> **Generate Secret**: Run `openssl rand -base64 32` to generate a secure `NEXTAUTH_SECRET`

---

## 🔧 Implementation

### App Router Setup (Next.js 13+)

#### 1. Create NextAuth Route Handler

Create the file: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers";

// Define VLife provider configuration
const VLifeProvider: OAuthConfig<any> = {
  id: "vlife",
  name: "VLife",
  type: "oauth",
  wellKnown: `${process.env.VLIFE_ISSUER}/.well-known/openid-configuration`,
  clientId: process.env.VLIFE_CLIENT_ID!,
  clientSecret: process.env.VLIFE_CLIENT_SECRET!,

  authorization: {
    params: {
      scope: "openid profile email offline_access",
    },
  },

  // Enable PKCE and state validation
  checks: ["pkce", "state"],

  // Map OIDC profile to NextAuth user
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      image: profile.picture,
      emailVerified: profile.email_verified,
    };
  },

  // Token endpoint configuration
  token: {
    url: `${process.env.VLIFE_ISSUER}/token`,
  },

  // UserInfo endpoint
  userinfo: {
    url: `${process.env.VLIFE_ISSUER}/me`,
  },
};

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [VLifeProvider],

  callbacks: {
    // JWT callback: runs when JWT is created or updated
    async jwt({ token, account, profile, user }) {
      // Initial sign in
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : 0,
          idToken: account.id_token,
          user: {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          },
        };
      }

      // Return previous token if not expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to refresh it
      return await refreshAccessToken(token);
    },

    // Session callback: runs whenever session is checked
    async session({ session, token }) {
      session.user = token.user as any;
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;

      return session;
    },
  },

  // Custom pages (optional)
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
};

// Token refresh function
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`${process.env.VLIFE_ISSUER}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        client_id: process.env.VLIFE_CLIENT_ID!,
        client_secret: process.env.VLIFE_CLIENT_SECRET!,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### 2. Add TypeScript Definitions

Create `types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    idToken?: string;
    error?: string;
    user?: {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };
  }
}
```

#### 3. Create Session Provider

Create `components/SessionProvider.tsx`:

```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

#### 4. Wrap App with Provider

Update `app/layout.tsx`:

```typescript
import SessionProvider from "@/components/SessionProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

---

### Pages Router Setup (Next.js 12 and below)

#### 1. Create NextAuth API Route

Create `pages/api/auth/[...nextauth].ts`:

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";

// Use the same configuration as App Router above
export const authOptions: NextAuthOptions = {
  // ... (same configuration as shown in App Router section)
};

export default NextAuth(authOptions);
```

#### 2. Wrap App with Provider

Update `pages/_app.tsx`:

```typescript
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
```

---

## 🎯 Usage Examples

### Client-Side Authentication

```typescript
"use client"; // For App Router

import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name || session.user?.email}!</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return <button onClick={() => signIn("vlife")}>Sign in with VLife</button>;
}
```

### Server-Side Authentication (App Router)

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div>
      <h1>Protected Page</h1>
      <p>User ID: {session.user.id}</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### Server-Side Authentication (Pages Router)

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}

export default function ProtectedPage({ session }: any) {
  return (
    <div>
      <h1>Protected Page</h1>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### Middleware Protection (App Router)

Create `middleware.ts` in your project root:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

---

## 🔑 Working with Tokens

> **📖 Quick Reference**: See [Token Reference Guide](./TOKEN_REFERENCE_GUIDE.md) for detailed information about Access, ID, and Refresh tokens.

### Access Token Usage

Use the access token to call VLife API endpoints:

```typescript
import { useSession } from "next-auth/react";

export default function UserProfile() {
  const { data: session } = useSession();

  async function fetchUserData() {
    if (!session?.accessToken) {
      console.error("No access token available");
      return;
    }

    const response = await fetch("https://api.vlifebiz.com/v1/user/profile", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();
    return data;
  }

  // ... component logic
}
```

### Server-Side API Calls

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = await fetch("https://api.vlifebiz.com/v1/user/profile", {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await response.json();
  return Response.json(data);
}
```

### ID Token Claims

Access ID token claims through the session:

```typescript
import { useSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode";

export default function UserClaims() {
  const { data: session } = useSession();

  if (session?.idToken) {
    const claims = jwtDecode(session.idToken);

    console.log("User ID:", claims.sub);
    console.log("Email:", claims.email);
    console.log("Email Verified:", claims.email_verified);
    console.log("Name:", claims.name);
  }

  return <div>{/* Your component */}</div>;
}
```

---

## 🔄 Token Refresh

Token refresh is **automatically handled** by NextAuth using the `jwt` callback. When the access token expires:

1. NextAuth detects expiration
2. Calls the `refreshAccessToken()` function
3. Uses the refresh token to get new tokens
4. Updates the session automatically

### Handling Refresh Errors

If refresh fails, the session will include an error:

```typescript
"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function SessionMonitor() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      // Force sign in
      signIn("vlife");
    }
  }, [session]);

  return null;
}
```

---

## 🌐 API Endpoints Reference

### VLife OIDC Endpoints

| Endpoint                                         | Purpose                  |
| ------------------------------------------------ | ------------------------ |
| `https://auth.vlifebiz.com/oidc/auth`            | Authorization endpoint   |
| `https://auth.vlifebiz.com/oidc/token`           | Token exchange & refresh |
| `https://auth.vlifebiz.com/oidc/me`              | UserInfo endpoint        |
| `https://auth.vlifebiz.com/oidc/end_session`     | Logout endpoint          |
| `https://auth.vlifebiz.com/oidc/.well-known/...` | OIDC discovery           |

### NextAuth API Routes

| Route                          | Purpose                    |
| ------------------------------ | -------------------------- |
| `/api/auth/signin`             | Sign in page               |
| `/api/auth/signout`            | Sign out endpoint          |
| `/api/auth/callback/:provider` | OAuth callback handler     |
| `/api/auth/session`            | Get current session (JSON) |
| `/api/auth/csrf`               | CSRF token endpoint        |

---

## 🔒 Security Best Practices

### 1. Environment Variables

- **Never commit** `.env.local` to version control
- Use different credentials for development and production
- Rotate `NEXTAUTH_SECRET` regularly

### 2. HTTPS in Production

```env
# Production environment
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

### 3. Secure Cookies

NextAuth automatically sets secure cookies in production when using HTTPS.

### 4. CSRF Protection

NextAuth includes built-in CSRF protection. Always use the provided hooks and API routes.

### 5. Session Security

```typescript
// Session configuration in authOptions
session: {
  strategy: "jwt", // Use JWT instead of database sessions
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // Update session every 24 hours
},
```

---

## 🎨 Custom Sign-In Page

Create `app/auth/signin/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-center text-3xl font-bold">Sign In</h2>

        <button
          onClick={() => signIn("vlife", { callbackUrl })}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign in with VLife
        </button>
      </div>
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: "Configuration Error" on signin

**Solution**: Ensure all environment variables are set correctly:

```bash
# Check your .env.local
VLIFE_CLIENT_ID=your-client-id
VLIFE_CLIENT_SECRET=your-client-secret
VLIFE_ISSUER=https://auth.vlifebiz.com/oidc
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
```

### Issue: Redirect URI Mismatch

**Solution**: Register the correct callback URL in VLife:

```
http://localhost:3000/api/auth/callback/vlife
```

For production:

```
https://yourdomain.com/api/auth/callback/vlife
```

### Issue: Token Refresh Failing

**Solution**: Ensure you're requesting the `offline_access` scope:

```typescript
authorization: {
  params: {
    scope: "openid profile email offline_access",
  },
},
```

### Issue: Session Not Persisting

**Solution**:

1. Check that `SessionProvider` wraps your app
2. Verify cookies are enabled in browser
3. Check CORS settings if frontend/backend on different domains

---

## 📚 Additional Resources

- **NextAuth.js Documentation**: [https://next-auth.js.org](https://next-auth.js.org)
- **OpenID Connect Spec**: [https://openid.net/connect/](https://openid.net/connect/)
- **VLife API Documentation**: [https://api.vlifebiz.com/docs](https://api.vlifebiz.com/docs)
- **OAuth 2.0 RFC**: [https://datatracker.ietf.org/doc/html/rfc6749](https://datatracker.ietf.org/doc/html/rfc6749)

---

## 🆚 NextAuth vs Manual PKCE Flow

| Feature                | NextAuth        | Manual PKCE (README)   |
| ---------------------- | --------------- | ---------------------- |
| **Setup Complexity**   | Low (pre-built) | High (manual)          |
| **Token Refresh**      | Automatic       | Manual implementation  |
| **Session Management** | Built-in        | Custom required        |
| **Best For**           | Production apps | Learning, custom flows |
| **Customization**      | Via callbacks   | Full control           |

---

**Last Updated**: January 2026  
**NextAuth Version**: 4.x  
**Next.js Compatibility**: 12, 13, 14, 15, 16+
