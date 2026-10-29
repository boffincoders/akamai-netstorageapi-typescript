import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { distDir, HOSTNAME, KEY, KEY_NAME, MockNetStorage, XML } from "./mock-netstorage";

const run = promisify(execFile);
const cli = path.join(distDir, "cli.js");
const preload = path.join(path.dirname(fileURLToPath(import.meta.url)), "route-to-mock.cjs");
const mock = new MockNetStorage();
let tmp: string;

beforeAll(() => mock.start());
afterAll(() => mock.stop());
beforeEach(() => {
  mock.reset();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ns-cli-"));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

async function cliRun(args: string[], env: Record<string, string> = {}) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cli, ...args, "--insecure-http"], {
      cwd: tmp,
      encoding: "buffer",
      env: {
        PATH: process.env.PATH,
        NODE_OPTIONS: `--require ${preload}`,
        MOCK_HOST: HOSTNAME,
        MOCK_PORT: String(mock.port),
        NETSTORAGE_HOST: HOSTNAME,
        NETSTORAGE_KEYNAME: KEY_NAME,
        NETSTORAGE_KEY: KEY,
        NETSTORAGE_CPCODE: "123456",
        ...env,
      },
    });
    return { code: 0, stdout: stdout as Buffer, stderr: stderr.toString() };
  } catch (err: any) {
    return { code: err.code as number, stdout: err.stdout as Buffer, stderr: err.stderr.toString() };
  }
}

const action = (a: string) => `version=1&action=${a}`;

describe("CLI", () => {
  it("lists a directory and places relative paths under the CP code", async () => {
    mock.reply = () => ({ body: XML.dir });
    const { code, stdout } = await cliRun(["ls", "images", "--max-entries", "5"]);
    expect(code).toBe(0);
    expect(mock.last.url).toBe("/123456/images");
    expect(mock.last.headers["x-akamai-acs-action"]).toBe(action("dir&format=xml&max_entries=5"));
    expect(mock.last.signatureValid).toBe(true);
    const out = stdout.toString();
    expect(out).toContain("thumbs/");
    expect(out).toContain("logo.png");
    expect(out).toContain("latest.png -> logo.png");
  });

  it("prints JSON with --json", async () => {
    mock.reply = () => ({ body: XML.du });
    const { code, stdout } = await cliRun(["du", "/123456", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout.toString())).toEqual({ du: { attribs: { directory: "/123456" }, "du-info": [{ files: "12", bytes: "3456" }] } });
  });

  it("uploads and downloads files byte for byte", async () => {
    const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    fs.writeFileSync(path.join(tmp, "in.bin"), bytes);
    expect((await cliRun(["upload", "in.bin", "files/"])).code).toBe(0);
    expect(mock.last.method).toBe("PUT");
    expect(mock.last.url).toBe("/123456/files/in.bin");
    expect(mock.last.body.equals(bytes)).toBe(true);

    mock.reply = () => ({ body: bytes });
    const { code, stdout } = await cliRun(["download", "files/in.bin", "out.bin"]);
    expect(code).toBe(0);
    expect(stdout.toString()).toContain("Saved out.bin");
    expect(fs.readFileSync(path.join(tmp, "out.bin")).equals(bytes)).toBe(true);

    const cat = await cliRun(["cat", "files/in.bin"]);
    expect(cat.stdout.equals(bytes)).toBe(true);
  });

  it("sends the right action for each write command", async () => {
    const cases: [string[], string, string, string][] = [
      [["mkdir", "a"], "POST", "/123456/a", action("mkdir")],
      [["rmdir", "a"], "POST", "/123456/a", action("rmdir")],
      [["rm", "a.txt"], "POST", "/123456/a.txt", action("delete")],
      [["rename", "a.txt", "b.txt"], "POST", "/123456/a.txt", action("rename&destination=%2F123456%2Fb.txt")],
      [["symlink", "a.txt", "link"], "POST", "/123456/link", action("symlink&target=%2F123456%2Fa.txt")],
      [["mtime", "a.txt", "1700000000"], "POST", "/123456/a.txt", action("mtime&format=xml&mtime=1700000000")],
      [["stat", "a.txt"], "GET", "/123456/a.txt", action("stat&format=xml")],
      [["list", "a", "--end", "z"], "GET", "/123456/a", action("list&format=xml&end=z")],
      [["quick-delete", "tree", "--yes"], "POST", "/123456/tree", action("quick-delete&quick-delete=imreallyreallysure")],
    ];
    for (const [args, method, url, act] of cases) {
      expect((await cliRun(args)).code, args.join(" ")).toBe(0);
      expect([mock.last.method, mock.last.url, mock.last.headers["x-akamai-acs-action"]]).toEqual([method, url, act]);
    }
  });

  it("exits 1 on HTTP errors and does not write the error body to disk", async () => {
    mock.reply = () => ({ status: 404, body: "Not Found" });
    const { code, stderr } = await cliRun(["download", "missing.txt"]);
    expect(code).toBe(1);
    expect(stderr).toContain("HTTP 404: Not Found");
    expect(fs.existsSync(path.join(tmp, "missing.txt"))).toBe(false);
  });

  it("exits 2 on usage errors without sending requests", async () => {
    expect((await cliRun(["quick-delete", "tree"])).stderr).toContain("--yes");
    expect((await cliRun(["frobnicate"])).code).toBe(2);
    expect((await cliRun(["stat", "a"], { NETSTORAGE_KEY: "" })).stderr).toContain("NETSTORAGE_KEY");
    expect((await cliRun(["mtime", "a", "soon"])).code).toBe(2);
    expect(mock.requests).toHaveLength(0);
  });

  it("prints help and version", async () => {
    expect((await cliRun(["--help"])).stdout.toString()).toContain("Usage: akamai-netstorage");
    const pkg = JSON.parse(fs.readFileSync(path.join(distDir, "..", "package.json"), "utf8"));
    expect((await cliRun(["-v"])).stdout.toString().trim()).toBe(pkg.version);
  });
});
