import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/platform", destination: "/leads", permanent: false },
      { source: "/platform/:path*", destination: "/leads", permanent: false },
    ];
  },
};

export default nextConfig;
