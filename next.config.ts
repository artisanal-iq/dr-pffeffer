import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence incorrect workspace root inference in builds
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
