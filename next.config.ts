import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/oidc/:path*",
        destination: "http://localhost:4001/oidc/:path*",
      },
    ];
  },
};

export default nextConfig;
