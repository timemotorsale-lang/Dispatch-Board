import { createServer } from "vite";
import { resolve } from "node:path";
const root = process.cwd();
const server = await createServer({
  root: resolve(root, "src/tests/fixtures/cash-print"), cacheDir: resolve(root, "tmp/cash-print-vite"),
  resolve: { alias: [
    { find: "./deal-draft-workspace", replacement: resolve(root, "src/tests/fixtures/cash-print/draft-store.tsx") },
    { find: "./shared-deal-identities", replacement: resolve(root, "src/tests/fixtures/cash-print/support.tsx") },
    { find: "./crm-next-vin-decoder", replacement: resolve(root, "src/tests/fixtures/cash-print/support.tsx") },
    { find: /^@\//, replacement: resolve(root, "src") + "/" }
  ] }, esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: Number(process.env.CASH_PRINT_PREVIEW_PORT || 3111), strictPort: true, fs: { allow: [root, resolve(root, "node_modules")] } }
});
await server.listen(); server.printUrls();
