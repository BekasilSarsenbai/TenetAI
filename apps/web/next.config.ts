import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this monorepo (a stray lockfile lives in $HOME).
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
