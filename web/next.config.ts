import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The web app shares its DTO definitions with the bot process via the
  // `@shared/*` path alias, which points to `../src/shared/*`. Setting
  // turbopack.root to the parent project lets the bundler resolve those
  // imports outside the web/ subdirectory.
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
