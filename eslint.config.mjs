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
    ".worktrees/**"
  ]
}, ...nextCoreWebVitals, ...nextTypeScript];

export default config;
