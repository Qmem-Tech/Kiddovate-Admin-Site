import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fixes: "Next.js inferred your workspace root, but it may not be correct."
    // Ensures Turbopack uses THIS project folder even if other lockfiles exist elsewhere.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
