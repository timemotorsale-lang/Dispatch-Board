import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const postcss = require("postcss");
const values = require("next/dist/compiled/postcss-modules-values");
const local = require("next/dist/compiled/postcss-modules-local-by-default");
const imports = require("next/dist/compiled/postcss-modules-extract-imports");
const scope = require("next/dist/compiled/postcss-modules-scope");
const compiler = () => postcss([values, local({ mode: "pure" }), imports(), scope()]);
describe("Live Board styles under Next.js CSS Modules rules", () => {
  it("compiles the real stylesheet, including freshness and display-mode styles", async () => {
    const file = path.join(process.cwd(), "src/features/board/team/team-now.module.css");
    const result = await compiler().process(await readFile(file, "utf8"), { from: file });
    expect(result.css).toContain("sourceDelayed"); expect(result.css).toContain("sourceCurrent");
    expect(result.css).toContain("display");
  });
  it("rejects the global-only selector that caused the reported build failure", async () => {
    await expect(compiler().process(":global(.board-source-delayed){color:red}", { from: "failure.module.css" })).rejects.toThrow("not pure");
  });
});
