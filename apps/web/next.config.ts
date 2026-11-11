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
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 960, 1440, 1920],
    imageSizes: [240, 480],
    minimumCacheTTL: 31_536_000,
  },
};

export default nextConfig;
