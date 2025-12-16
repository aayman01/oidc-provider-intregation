import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // The OIDC Auth URL
  const oidcUrl =
    "http://localhost:4001/oidc/auth?client_id=partner-dashboard-local-2&redirect_uri=http://localhost:3000/auth/callback&scope=openid profile email&response_type=code&code_challenge=d46e066c84bb8463c3a3e577419df6f6ca56dca4bd2d6cd631f854f59ee37144666cba9ca54b468de0a4efcc112089e1&code_challenge_method=S256";

  try {
    const res = await fetch(oidcUrl, {
      method: "GET",
      redirect: "manual", // We want to inspect the redirect
    });

    const location = res.headers.get("location");
    const setCookie = res.headers.get("set-cookie");

    console.log("Proxy Auth - Location:", location);
    console.log("Proxy Auth - Set-Cookie:", setCookie);

    // Extract UID from location
    let uid = null;
    if (location && location.includes("/interaction/")) {
      const parts = location.split("/");
      uid = parts[parts.length - 1];
    }

    if (!uid) {
      return NextResponse.json(
        {
          error: "Failed to extract UID from redirect",
          details: { location, status: res.status },
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ uid });

    // Forward Cookies
    if (setCookie) {
      // Simple forwarding. For robust handling of multiple cookies, we might need parsing.
      // But fetch usually combines them or we can iterate if it's an array (Node 18+ headers).
      // Here we assume it's a string or we set it directly.
      // Important: Strip 'Secure' if running on HTTP localhost, and strip 'Domain' to allow localhost.
      const adjustedCookie = setCookie
        .replace(/Domain=[^;]+;?/gi, "")
        .replace(/Secure;?/gi, ""); // Optional: only if localhost is HTTP

      response.headers.set("Set-Cookie", adjustedCookie);
    }

    return response;
  } catch (error: any) {
    console.error("Proxy Auth Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
