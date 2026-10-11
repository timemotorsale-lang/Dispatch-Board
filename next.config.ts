import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  serverExternalPackages: ["@prisma/client", "prisma", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/vehicles/transfers/documents": ["./node_modules/@tesseract.js-data/eng/**/*", "./node_modules/tesseract.js-core/**/*"]
  },
  typedRoutes: false
};

export default nextConfig;

