import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to successfully complete even if there are ESLint warnings
    ignoreDuringBuilds: false, // Keep linting during builds
  },
  typescript: {
    // Allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: false,
  },
  // Treat warnings as warnings, not errors
  experimental: {
    // This ensures warnings don't block the build
  }
};

export default nextConfig;
