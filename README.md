# OIDC Provider Frontend

A Next.js 16 frontend application for testing and demonstrating OpenID Connect (OIDC) authentication flows with PKCE support.

## 🚀 Overview

This application serves as a test client for the OIDC Provider backend, implementing the OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange). It provides a complete authentication flow including login, consent, and callback handling.

## 📋 Features

- ✅ **OAuth 2.0 Authorization Code Flow with PKCE**
- ✅ **Custom Login & Consent Pages**
- ✅ **Automatic Token Exchange**
- ✅ **Token Refresh Support**
- ✅ **Token Introspection & Revocation**
- ✅ **Session Management & Logout**
- ✅ **OIDC Discovery Endpoint Testing**
- ✅ **Interactive Test Client UI**

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Runtime**: React 19

## 📁 Project Structure

```
oidc-provider/
├── app/
│   ├── api/                    # API routes (optional proxy)
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx        # OAuth callback handler
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── consent/
│   │   └── page.tsx            # Consent page
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main test client
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Running OIDC Provider backend

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## 🔐 Authentication Flow

### 1. Start Authorization

The test client generates PKCE values and redirects to the OIDC authorization endpoint:

```typescript
// Generate PKCE code verifier and challenge
const codeVerifier = generateRandomString(128);
const codeChallenge = await sha256(codeVerifier);

// Store verifier for later use
sessionStorage.setItem("code_verifier", codeVerifier);

// Redirect to authorization endpoint
window.location.href =
  "/oidc/auth?" +
  new URLSearchParams({
    client_id: "partner-dashboard-local-2",
    redirect_uri: "http://localhost:3000/auth/callback",
    scope: "openid profile email",
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
```

### 2. Login Page

Users are redirected to `/login?uid=INTERACTION_UID` where they enter credentials:

```typescript
// Form submits directly to backend
<form method="POST" action={`/oidc/interaction/${uid}/login`}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Sign In</button>
</form>
```

### 3. Consent Page

After successful login, users grant permissions at `/consent?uid=INTERACTION_UID`:

```typescript
// Grant consent for requested scopes
<form method="POST" action={`/oidc/interaction/${uid}/consent`}>
  <button type="submit">Authorize</button>
</form>
```

### 4. Callback & Token Exchange

The callback page automatically exchanges the authorization code for tokens:

```typescript
// Retrieve code verifier from storage
const codeVerifier = sessionStorage.getItem("code_verifier");

// Exchange code for tokens
const response = await fetch("/oidc/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: "http://localhost:3000/auth/callback",
    client_id: "partner-dashboard-local-2",
    code_verifier: codeVerifier,
  }),
});

const tokens = await response.json();
// Store tokens in sessionStorage
```

## 🧪 Test Client Features

The main page (`/`) provides an interactive UI to test all OIDC endpoints:

### Available Operations

1. **Authorization Flow** - Start the complete auth flow with PKCE
2. **Token Exchange** - Automatically handled in callback
3. **User Info** - Fetch user profile data using access token
4. **Refresh Token** - Get new access token using refresh token
5. **Discovery** - View OIDC provider configuration
6. **Introspection** - Validate and inspect token metadata
7. **Revoke Token** - Invalidate access/refresh tokens
8. **Logout** - End user session and clear tokens

### Response Display

The UI displays JSON responses for:

- Access tokens, ID tokens, and refresh tokens
- User profile information
- OIDC discovery metadata
- Token introspection results

## 🔒 Security Considerations

### PKCE Implementation

This app implements PKCE to protect against authorization code interception:

- **Code Verifier**: 128-character random string
- **Code Challenge**: SHA-256 hash of the verifier (base64url encoded)
- **Storage**: Code verifier stored in sessionStorage during flow

### Token Storage

**Development**: Tokens are stored in `sessionStorage` for testing purposes.

**Production Recommendations**:

- Use httpOnly cookies instead of sessionStorage
- Implement proper CSRF protection
- Never use localStorage (vulnerable to XSS)
- Always use HTTPS

### Best Practices

- ✅ Always validate redirect URIs
- ✅ Implement state parameter for CSRF protection
- ✅ Use short-lived access tokens (1 hour)
- ✅ Rotate refresh tokens on use
- ✅ Clear all tokens on logout
- ✅ Handle token expiration gracefully

## 🌐 API Endpoints

The frontend interacts with these OIDC backend endpoints:

| Endpoint                                 | Method | Purpose                  |
| ---------------------------------------- | ------ | ------------------------ |
| `/oidc/auth`                             | GET    | Start authorization flow |
| `/oidc/token`                            | POST   | Exchange code for tokens |
| `/oidc/userinfo`                         | GET    | Get user information     |
| `/oidc/introspection`                    | POST   | Introspect token         |
| `/oidc/revocation`                       | POST   | Revoke token             |
| `/oidc/end_session`                      | GET    | End user session         |
| `/oidc/.well-known/openid-configuration` | GET    | Discovery metadata       |
| `/oidc/interaction/:uid`                 | GET    | Get interaction details  |
| `/oidc/interaction/:uid/login`           | POST   | Submit login             |
| `/oidc/interaction/:uid/consent`         | POST   | Grant consent            |

## 📚 Additional Resources

- [OIDC Implementation Guide](./OIDC_IMPLEMENTATION_GUIDE.html) - Complete technical documentation
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
- [Next.js Documentation](https://nextjs.org/docs)

## 🐛 Troubleshooting

### Common Issues

**Issue**: "No access token found"

- **Solution**: Complete the authorization flow first by clicking "Start Auth Flow"

**Issue**: "Token exchange failed"

- **Solution**: Ensure the backend OIDC provider is running and accessible

**Issue**: "CORS errors"

- **Solution**: Use traditional form submissions for login/consent (already implemented)

**Issue**: "Invalid code_verifier"

- **Solution**: Ensure sessionStorage is not cleared between auth start and callback

### Debug Mode

Check browser console for detailed logs during authentication flow. All errors are logged with context.

## 🤝 Contributing

When making changes:

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Test all authentication flows
4. Update this README if adding new features

## 📄 License

This project is part of the SSO authentication system.

---

**Last Updated**: December 2025  
**Next.js Version**: 16.0.10  
**React Version**: 19.2.1
