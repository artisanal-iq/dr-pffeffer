import type { NextConfig } from "next";

if (process.env.CSS_TRANSFORMER_WASM) {
  delete process.env.CSS_TRANSFORMER_WASM;
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
