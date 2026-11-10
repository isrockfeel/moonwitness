import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@moonwitness/ui", "@moonwitness/core"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
