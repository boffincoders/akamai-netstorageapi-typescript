import { execFileSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { distDir } from "./mock-netstorage";

const require = createRequire(import.meta.url);
const entry = path.join(distDir, "netstorage.js");
const opts = { hostname: "h", keyName: "k", key: "s", cpCode: "1", ssl: false };

describe("module interop", () => {
  it("exports the class as `default`, exactly as 1.0.x did", () => {
    const mod = require(entry);
    expect(typeof mod.default).toBe("function");
    expect(new mod.default(opts)).toBeInstanceOf(mod.default);
    expect(typeof mod).toBe("object");
    expect(mod.__esModule).toBe(true);
    expect(Object.keys(mod)).toEqual(["default"]);
  });

  it("works with TypeScript/Babel default-import helpers", () => {
    const mod = require(entry);
    const interopDefault = (m: any) => (m && m.__esModule ? m : { default: m });
    expect(interopDefault(mod).default).toBe(mod.default);
  });

  it("works from native ESM through `.default`", () => {
    const url = pathToFileURL(entry).href;
    const script = `
      import pkg from ${JSON.stringify(url)};
      const opts = ${JSON.stringify(opts)};
      console.log(JSON.stringify([new pkg.default(opts) instanceof pkg.default]));`;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script]).toString();
    expect(JSON.parse(out)).toEqual([true]);
  });

  it("type-checks for TypeScript consumers, with and without esModuleInterop", () => {
    const tsc = require.resolve("typescript/bin/tsc");
    for (const project of ["tsconfig.interop.json", "tsconfig.no-interop.json"]) {
      execFileSync(process.execPath, [tsc, "-p", path.join(__dirname, "types", project)], { stdio: "pipe" });
    }
  }, 30_000);
});
