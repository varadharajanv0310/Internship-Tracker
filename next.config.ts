import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The scan output in /data is read at build/request time as plain JSON.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*.json"],
  },
};

export default nextConfig;
