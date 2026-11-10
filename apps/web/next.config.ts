import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@moonwitness/ui",
    "@moonwitness/core",
    "@moonwitness/types",
    "@moonwitness/assets",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
