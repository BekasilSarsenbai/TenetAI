import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this monorepo (a stray lockfile lives in $HOME).
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // Transpile the workspace DB package (shipped as TS source).
  transpilePackages: ["@tenet/db"],
};

export default nextConfig;
