import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "epub-gen-memory"],
};

export default nextConfig;
