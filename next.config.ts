import type { NextConfig } from "next";

const previewOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", ...previewOrigins],
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  serverExternalPackages: ["@prisma/client", "prisma", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/vehicles/transfers/pdf-worker": ["./node_modules/pdfjs-dist/build/pdf.worker.min.mjs"],
    "/api/vehicles/transfers/documents": ["./node_modules/@tesseract.js-data/eng/**/*", "./node_modules/tesseract.js-core/**/*"]
  },
  typedRoutes: false
};

export default nextConfig;

