import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '11mb', // Allow file uploads up to 10 MB plus form data overhead
    },
  },
};

export default nextConfig;
