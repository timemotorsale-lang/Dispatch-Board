import { fileURLToPath } from "node:url";

import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"]
  }
});

