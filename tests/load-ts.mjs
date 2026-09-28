// Test-only TypeScript loader; uses the project's existing compiler, with no new dependency.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = fileURLToPath(new URL("../src/", import.meta.url)).replaceAll(
  "\\",
  "/",
);
require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8").replaceAll(
    'from "@/',
    'from "' + root,
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
export function load(path) {
  return require(path);
}
