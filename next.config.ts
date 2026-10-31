import type { NextConfig } from "next";
import { parseServerOrigin } from "./src/lib/server-origin";

const websiteOrigin = process.env.SONDER_WEBSITE_ORIGIN;
const configuredOrigin = parseServerOrigin(websiteOrigin);
if (websiteOrigin !== undefined && !configuredOrigin) throw new Error("Invalid SONDER_WEBSITE_ORIGIN");

const nextConfig: NextConfig = {
  ...(configuredOrigin ? { experimental: { serverActions: { allowedOrigins: [configuredOrigin.host] } } } : {}),
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
  async redirects() {
    return [
      {
        source: "/products/:path*",
        destination: "/apps/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
