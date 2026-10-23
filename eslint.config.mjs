import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [{
  ignores: [
    ".codex-runtime/**",
    ".next/**",
    ".next-*/**",
    ".next-e2e/**",
    ".next-local*/**",
    ".next-review/**",
    ".next-runtime/**",
    "test-results/**",
    "apps/dealership/.next/**",
    "apps/dealership/test-results/**",
    ".worktrees/**"
  ]
}, ...nextCoreWebVitals, ...nextTypeScript, {
  files: ["tools/next-eslint-glob/index.cjs"],
  // Next ESLint loads this adapter synchronously through CommonJS.
  rules: { "@typescript-eslint/no-require-imports": "off" }
}];

export default config;
