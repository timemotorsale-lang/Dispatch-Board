import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs") as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir: string | unknown[] } } }) => string[];
};
const plugin = require("@next/eslint-plugin-next");
const { Linter } = require("eslint");
const temporaryRoots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "next-glob-compatibility-"));
  temporaryRoots.push(root);
  for (const name of ["inventory", "repairs"]) {
    mkdirSync(join(root, name, "pages"), { recursive: true });
    writeFileSync(join(root, name, "pages", "index.tsx"), "export default function Home() { return null; }");
  }
  writeFileSync(join(root, "not-a-directory.txt"), "fixture");
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Next ESLint glob replacement", () => {
  it("preserves the default root", () => {
    const root = fixture();
    expect(getRootDirs({ cwd: root, settings: {} })).toEqual([root]);
  });

  it("expands directory-only wildcard, array, and Windows-style roots", () => {
    const root = fixture();
    const expected = [join(root, "inventory"), join(root, "repairs")].sort();
    // Next joins these roots with page directories; compare resolved directories, not glob formatting.
    const expand = (rootDir: string | unknown[]) => getRootDirs({ cwd: root, settings: { next: { rootDir } } }).map((path) => resolve(path)).sort();
    expect(expand(`${root}/*`)).toEqual(expected);
    expect(expand([`${root}/inventory`, `${root}/repairs`, null])).toEqual(expected);
    expect(expand(`${root}\\*`)).toEqual(expected);
  });

  it("still reports unsafe links in a configured Next application", () => {
    const root = fixture();
    const linter = new Linter();
    const config = [{
      files: ["**/*.js"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      settings: { next: { rootDir: `${root}/*` } },
      plugins: { "@next/next": plugin },
      rules: { "@next/next/no-html-link-for-pages": "error" }
    }];
    const messages = linter.verify('const page = <a href="/">Home</a>;', config, { filename: "fixture.js" });
    expect(messages).toEqual(expect.arrayContaining([expect.objectContaining({ ruleId: "@next/next/no-html-link-for-pages", severity: 2 })]));
    expect(linter.verify('const page = <a href="https://example.com">External</a>;', config, { filename: "fixture.js" })).toEqual([]);
  });
});
