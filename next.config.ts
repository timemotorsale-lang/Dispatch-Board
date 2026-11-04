import type { NextConfig } from "next";

const previewOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", ...previewOrigins],
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  serverExternalPackages: ["@prisma/client", "prisma", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/crm/v1/contract-packets": ["./docs/sales-signing-package/final/forms/**/*.pdf", "./public/brand/time-motor-sales-horizontal.png", "./public/forms/minnesota-retail-sale/*.pdf"],
    "/api/crm/v1/cash-sale-forms": ["./docs/sales-signing-package/final/forms/**/*.pdf"],
    "/api/vehicles/transfers/pdf-worker": ["./node_modules/pdfjs-dist/build/pdf.worker.min.mjs"],
    "/api/vehicles/transfers/documents": ["./node_modules/@tesseract.js-data/eng/**/*", "./node_modules/tesseract.js-core/**/*"]
  },
  typedRoutes: false
};

export default nextConfig;

