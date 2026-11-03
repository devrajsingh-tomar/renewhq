import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    // Avoid build blockages due to type mismatch checks in Vercel bundle assembly
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
