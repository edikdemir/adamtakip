import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Suppress middleware deprecation warning for Next.js 16
  },
};

export default nextConfig;
