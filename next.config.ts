import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
