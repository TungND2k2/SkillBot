import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Heavy native packages — keep them server-only.
  serverExternalPackages: ["mongodb"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Cho phép upload file lớn (mặc định Next.js serverActions = 1MB).
  // 50MB đủ cho hoá đơn / đề bài / ảnh chất lượng cao.
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
