import { assertSamplePolicy } from "./config/sample-policy.mjs";

assertSamplePolicy(process.env);

const config = {
  basePath: process.env.NEXT_PUBLIC_REVIEW_BASE_PATH === "/website-review" ? "/website-review" : "",
  images: { unoptimized: process.env.NEXT_PUBLIC_REVIEW_BASE_PATH === "/website-review" },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }
    ] }];
  }
};

export default config;
