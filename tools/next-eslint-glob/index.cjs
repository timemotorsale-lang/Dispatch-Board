const { isAbsolute } = require("node:path");
const { globSync: tinyGlobSync } = require("tinyglobby");

// Scoped to Next ESLint's getRootDirs: fail loudly if an upgrade needs another API.
function globSync(pattern, options) {
  if (typeof pattern !== "string" || options?.onlyDirectories !== true || Object.keys(options).some((key) => key !== "onlyDirectories")) {
    throw new TypeError("Next ESLint glob adapter only supports directory root discovery");
  }
  return tinyGlobSync(pattern, {
    onlyDirectories: true,
    expandDirectories: false,
    absolute: isAbsolute(pattern)
  }).map((directory) => directory.replace(/\/$/, ""));
}

module.exports = { globSync };
