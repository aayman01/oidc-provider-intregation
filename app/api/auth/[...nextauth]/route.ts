import NextAuth, { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";

// Helper to get env var or default
const VLIFE_ISSUER = process.env.VLIFE_ISSUER;

// Define VLife provider configuration
const VLifeProvider: OAuthConfig<any> = {
  id: "vlife",
  name: "VLife",
  type: "oauth",
  wellKnown: `${VLIFE_ISSUER}/.well-known/openid-configuration`,
  clientId: process.env.VLIFE_CLIENT_ID!,
  clientSecret: process.env.VLIFE_CLIENT_SECRET!,

  authorization: {
    params: {
      scope: "openid profile email offline_access",
    },
  },

  // Force client_secret_post to match the backend configuration
  client: {
    token_endpoint_auth_method: "client_secret_post",
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

  // Token endpoint configuration for internal calls if needed defaults
};

// Token refresh function
async function refreshAccessToken(token: any) {
  try {
    const url = `${VLIFE_ISSUER}/token`;

    const response = await fetch(url, {
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
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [VLifeProvider],

  callbacks: {
    // JWT callback: runs when JWT is created or updated
    async jwt({ token, account, profile }) {
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
            email: profile.email as string,
            name: profile.name as string,
            picture: (profile as any).picture,
          },
        };
      }

      // Return previous token if not expired
      // If accessTokenExpires is missing, we assume it's valid or check logic
      if (
        token.accessTokenExpires &&
        Date.now() < (token.accessTokenExpires as number)
      ) {
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

  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
