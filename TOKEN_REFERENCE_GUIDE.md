# VLife OIDC - Token Reference Quick Guide

Quick reference for understanding and using tokens in VLife's OIDC implementation.

---

## 🎫 Token Types

### 1. Access Token

**Purpose**: Authentication for API calls to protected resources

**Format**: JWT (JSON Web Token)

**Lifetime**: 1 hour (3600 seconds)

**Usage**:

```typescript
// API request with access token
const response = await fetch("https://api.vlifebiz.com/v1/user/profile", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

**Contains**:

- `sub` - User ID
- `iss` - Issuer (VLife)
- `aud` - Audience (your client ID)
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp
- `scope` - Granted scopes

### 2. ID Token

**Purpose**: User identity information (not for API calls)

**Format**: JWT (JSON Web Token)

**Lifetime**: 1 hour (3600 seconds)

**Usage**:

```typescript
// Decode to get user info (client-side only)
const claims = jwtDecode(idToken);
console.log("User ID:", claims.sub);
console.log("Email:", claims.email);
console.log("Name:", claims.name);
```

**Contains**:

- `sub` - User ID
- `email` - User email
- `email_verified` - Email verification status
- `name` - Full name
- `given_name` - First name
- `family_name` - Last name
- `picture` - Profile picture URL
- `nonce` - Nonce (for validation)

**Important**:

- ❌ Never use ID token for API authorization
- ✅ Use only for displaying user information
- ✅ Validate signature before trusting claims

### 3. Refresh Token

**Purpose**: Obtain new access tokens without user interaction

**Format**: Opaque string (not a JWT)

**Lifetime**: 30 days (2,592,000 seconds)

**Usage**:

```typescript
// Get new access token
const response = await fetch("https://auth.vlifebiz.com/oidc/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: "your-client-id",
    client_secret: "your-client-secret",
  }),
});

const tokens = await response.json();
// New: access_token, id_token, refresh_token
```

**Security**:

- 🔒 Store securely (never in localStorage)
- 🔒 Use httpOnly cookies in production
- 🔒 Rotate on each use
- 🔒 Revoke on logout

---

## 📊 Token Comparison

| Feature           | Access Token         | ID Token          | Refresh Token |
| ----------------- | -------------------- | ----------------- | ------------- |
| **Format**        | JWT                  | JWT               | Opaque String |
| **Purpose**       | API Authorization    | User Identity     | Token Renewal |
| **Lifetime**      | 1 hour               | 1 hour            | 30 days       |
| **Sent to API**   | ✅ Yes               | ❌ No             | ❌ No         |
| **Contains User** | Minimal (just `sub`) | Full profile      | N/A           |
| **Renewable**     | Via refresh token    | Via refresh token | N/A           |
| **Revocable**     | ✅ Yes               | N/A               | ✅ Yes        |

---

## 🔄 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    1. Initial Authentication                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────┐
        │  Receive: Access + ID + Refresh Tokens   │
        └──────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────┐
        │      2. Use Access Token for APIs        │
        │         (Valid for 1 hour)               │
        └──────────────────────────────────────────┘
                              ↓
                    Token Expires? ───── No ──→ Continue Using
                              ↓
                             Yes
                              ↓
        ┌──────────────────────────────────────────┐
        │    3. Use Refresh Token to Get New       │
        │        Access + ID Tokens                │
        └──────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────┐
        │  Repeat for 30 days (refresh lifetime)   │
        └──────────────────────────────────────────┘
                              ↓
                  Refresh Expires? ───── No ──→ Continue
                              ↓
                             Yes
                              ↓
        ┌──────────────────────────────────────────┐
        │  4. Re-authenticate (user login again)   │
        └──────────────────────────────────────────┘
```

---

## 🔑 Scopes & Claims

### Standard Scopes

| Scope            | Claims Included                                |
| ---------------- | ---------------------------------------------- |
| `openid`         | `sub` (required for OIDC)                      |
| `profile`        | `name`, `given_name`, `family_name`, `picture` |
| `email`          | `email`, `email_verified`                      |
| `offline_access` | Grants refresh token                           |

### Requesting Scopes

```typescript
// Authorization URL
const authUrl = new URL("https://auth.vlifebiz.com/oidc/auth");
authUrl.searchParams.set("scope", "openid profile email offline_access");
authUrl.searchParams.set("client_id", "your-client-id");
// ... other params
```

**Note**: Always request `offline_access` if you need a refresh token.

---

## 🛡️ Security Best Practices

### Access Token

- ✅ Send in `Authorization` header only
- ✅ Never log or expose in URLs
- ✅ Check expiration before use
- ✅ Store in memory or httpOnly cookies
- ❌ Never use `localStorage` in production

### ID Token

- ✅ Validate signature (using JWKS)
- ✅ Verify `iss`, `aud`, `exp` claims
- ✅ Check `nonce` matches request
- ❌ Don't use for API authorization
- ❌ Don't trust without validation

### Refresh Token

- 🔒 **Most sensitive** - treat like a password
- ✅ Store in httpOnly, secure cookies
- ✅ Revoke on logout
- ✅ Rotate on each use
- ❌ Never send to frontend in production
- ❌ Never expose in logs or errors

---

## 📍 Where to Use Each Token

### Access Token Usage

```typescript
// ✅ Correct: API authorization
fetch("/api/user/profile", {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// ❌ Wrong: Don't use ID token for API
fetch("/api/user/profile", {
  headers: { Authorization: `Bearer ${idToken}` }, // WRONG!
});
```

### ID Token Usage

```typescript
// ✅ Correct: Display user information
const user = jwtDecode(idToken);
return <div>Welcome, {user.name}!</div>;

// ✅ Correct: Email verification check
if (user.email_verified) {
  // Show verified badge
}

// ❌ Wrong: Don't use for API calls
// (Use access token instead)
```

### Refresh Token Usage

```typescript
// ✅ Correct: Get new tokens when access token expires
if (isAccessTokenExpired(accessToken)) {
  const newTokens = await refreshAccessToken(refreshToken);
  accessToken = newTokens.access_token;
}

// ❌ Wrong: Never send refresh token to public APIs
fetch("/api/public/data", {
  headers: { Authorization: `Bearer ${refreshToken}` }, // WRONG!
});
```

---

## 🔍 Token Validation

### Access Token Validation

```typescript
async function validateAccessToken(token: string) {
  // Option 1: Introspection endpoint (recommended)
  const response = await fetch("https://auth.vlifebiz.com/oidc/introspection", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: token,
      client_id: "your-client-id",
      client_secret: "your-client-secret",
    }),
  });

  const result = await response.json();
  return result.active === true;
}
```

### ID Token Validation

```typescript
import { jwtVerify } from "jose";

async function validateIdToken(token: string) {
  const JWKS = await fetch("https://auth.vlifebiz.com/oidc/jwks").then((res) =>
    res.json()
  );

  const { payload } = await jwtVerify(token, JWKS);

  // Verify claims
  if (payload.iss !== "https://auth.vlifebiz.com/oidc") {
    throw new Error("Invalid issuer");
  }

  if (payload.aud !== "your-client-id") {
    throw new Error("Invalid audience");
  }

  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error("Token expired");
  }

  return payload;
}
```

---

## 🧪 Testing Tokens

### Decode JWT (Development Only)

```typescript
// Quick decode for debugging (no validation)
function decodeJWT(token: string) {
  const [header, payload, signature] = token.split(".");

  const decodedPayload = JSON.parse(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
  );

  console.log("Token Claims:", decodedPayload);
  return decodedPayload;
}
```

### Check Token Expiration

```typescript
function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  const exp = decoded.exp;

  if (!exp) return true;

  return Date.now() >= exp * 1000;
}

function getTimeUntilExpiration(token: string): number {
  const decoded = decodeJWT(token);
  const exp = decoded.exp;

  if (!exp) return 0;

  return Math.max(0, exp * 1000 - Date.now());
}
```

---

## 📱 Common Patterns

### Pattern 1: Auto-Refresh Before Expiration

```typescript
// Refresh 5 minutes before expiration
const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

async function ensureValidToken() {
  const timeLeft = getTimeUntilExpiration(accessToken);

  if (timeLeft < REFRESH_BUFFER) {
    const newTokens = await refreshAccessToken(refreshToken);
    accessToken = newTokens.access_token;
    refreshToken = newTokens.refresh_token;
  }

  return accessToken;
}
```

### Pattern 2: Automatic Retry on 401

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = await ensureValidToken();

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If 401, try refreshing token once
  if (response.status === 401) {
    const newTokens = await refreshAccessToken(refreshToken);
    token = newTokens.access_token;

    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}
```

### Pattern 3: Token Storage (Production)

```typescript
// Server-side API route (Next.js example)
export async function POST(request: Request) {
  const { access_token, refresh_token, id_token } = await request.json();

  // Store in httpOnly cookies
  const response = new Response("Tokens stored", {
    headers: {
      "Set-Cookie": [
        `access_token=${access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
        `refresh_token=${refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
        `id_token=${id_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
      ].join(", "),
    },
  });

  return response;
}
```

---

## 🆘 Troubleshooting

### "Invalid token" error

**Cause**: Token expired or malformed

**Solution**: Check expiration with `decodeJWT()` and refresh if needed

### "Invalid audience" error

**Cause**: Token issued for different client

**Solution**: Ensure `client_id` matches the one used during authorization

### "Token revoked" error

**Cause**: Token was explicitly revoked

**Solution**: Re-authenticate user to get new tokens

### "CORS error" when validating token

**Cause**: Trying to validate from browser

**Solution**: Validate tokens server-side only

---

## 📚 Resources

- **VLife OIDC Discovery**: [https://auth.vlifebiz.com/oidc/.well-known/openid-configuration](https://auth.vlifebiz.com/oidc/.well-known/openid-configuration)
- **JWT Decoder (testing)**: [https://jwt.io](https://jwt.io)
- **OAuth 2.0 RFC**: [https://datatracker.ietf.org/doc/html/rfc6749](https://datatracker.ietf.org/doc/html/rfc6749)
- **OIDC Specification**: [https://openid.net/specs/openid-connect-core-1_0.html](https://openid.net/specs/openid-connect-core-1_0.html)

---

**Quick Tip**: When in doubt, use the introspection endpoint to check if a token is valid!

```bash
# Test token validity
curl -X POST https://auth.vlifebiz.com/oidc/introspection \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```
