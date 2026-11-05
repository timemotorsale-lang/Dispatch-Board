import { createServer } from "vite";
import { resolve } from "node:path";
const root = process.cwd();
const server = await createServer({
  root: resolve(root, "src/tests/fixtures/guided-test-drive"),
  cacheDir: resolve(root, "tmp/guided-test-drive-vite"),
  resolve: { alias: [
    { find: "./deal-draft-workspace", replacement: resolve(root, "src/tests/fixtures/guided-test-drive/draft-store.tsx") },
    { find: /^@\//, replacement: resolve(root, "src") + "/" }
  ] },
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: Number(process.env.TEST_DRIVE_PREVIEW_PORT || 3107), strictPort: true, fs: { allow: [root, resolve(root, "node_modules")] } }
});
await server.listen();
server.printUrls();
