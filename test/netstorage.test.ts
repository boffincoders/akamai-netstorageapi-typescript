import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config, HOSTNAME, MockNetStorage, MockProxy, Netstorage, viaCallback, XML } from "./mock-netstorage";

const mock = new MockNetStorage();
let ns: InstanceType<typeof Netstorage>;
let tmp: string;

beforeAll(() => mock.start());
afterAll(() => mock.stop());
beforeEach(() => {
  mock.reset();
  ns = new Netstorage(config());
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ns-test-"));
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const action = (a: string) => `version=1&action=${a}`;

// One row per operation: how to call the callback form and the async form, and the request NetStorage must receive.
type Operation = {
  name: string;
  callback: (cb: any) => void;
  async: () => Promise<unknown>;
  method: string;
  path: string;
  action: string;
};

const OPERATION_NAMES = ["dir", "list", "du", "stat", "mkdir", "rmdir", "mtime", "delete", "quickDelete", "rename", "symlink", "upload", "uploadBuffer", "download", "downloadBuffer"];

const operations = (): Operation[] => {
  const file = path.join(tmp, "local.txt");
  fs.writeFileSync(file, "hello");
  return [
    { name: "dir", callback: (cb) => ns.dir("/123456/images", cb), async: () => ns.dirAsync("/123456/images"), method: "GET", path: "/123456/images", action: action("dir&format=xml") },
    { name: "list", callback: (cb) => ns.list("/123456", cb), async: () => ns.listAsync("/123456"), method: "GET", path: "/123456", action: action("list&format=xml") },
    { name: "du", callback: (cb) => ns.du("/123456", cb), async: () => ns.duAsync("/123456"), method: "GET", path: "/123456", action: action("du&format=xml") },
    { name: "stat", callback: (cb) => ns.stat("/123456/hello.txt", cb), async: () => ns.statAsync("/123456/hello.txt"), method: "GET", path: "/123456/hello.txt", action: action("stat&format=xml") },
    { name: "mkdir", callback: (cb) => ns.mkdir("/123456/new", cb), async: () => ns.mkdirAsync("/123456/new"), method: "POST", path: "/123456/new", action: action("mkdir") },
    { name: "rmdir", callback: (cb) => ns.rmdir("/123456/old", cb), async: () => ns.rmdirAsync("/123456/old"), method: "POST", path: "/123456/old", action: action("rmdir") },
    { name: "mtime", callback: (cb) => ns.mtime("/123456/a.txt", 1700000000, cb), async: () => ns.mtimeAsync("/123456/a.txt", 1700000000), method: "POST", path: "/123456/a.txt", action: action("mtime&format=xml&mtime=1700000000") },
    { name: "delete", callback: (cb) => ns.delete("/123456/a.txt", cb), async: () => ns.deleteAsync("/123456/a.txt"), method: "POST", path: "/123456/a.txt", action: action("delete") },
    { name: "quickDelete", callback: (cb) => ns.quickDelete("/123456/tree", cb), async: () => ns.quickDeleteAsync("/123456/tree"), method: "POST", path: "/123456/tree", action: action("quick-delete&quick-delete=imreallyreallysure") },
    { name: "rename", callback: (cb) => ns.rename("/123456/a.txt", "/123456/b c.txt", cb), async: () => ns.renameAsync("/123456/a.txt", "/123456/b c.txt"), method: "POST", path: "/123456/a.txt", action: action("rename&destination=%2F123456%2Fb%20c.txt") },
    { name: "symlink", callback: (cb) => ns.symlink("/123456/a.txt", "/123456/link", cb), async: () => ns.symlinkAsync("/123456/a.txt", "/123456/link"), method: "POST", path: "/123456/link", action: action("symlink&target=%2F123456%2Fa.txt") },
    { name: "upload", callback: (cb) => ns.upload(file, "/123456/up.txt", cb), async: () => ns.uploadAsync(file, "/123456/up.txt"), method: "PUT", path: "/123456/up.txt", action: action("upload") },
    { name: "uploadBuffer", callback: (cb) => ns.uploadBuffer(Buffer.from("hi"), "b.txt", "/123456/b.txt", cb), async: () => ns.uploadBufferAsync(Buffer.from("hi"), "b.txt", "/123456/b.txt"), method: "PUT", path: "/123456/b.txt", action: action("upload") },
    { name: "download", callback: (cb) => ns.download("/123456/d.txt", path.join(tmp, "d.txt"), cb), async: () => ns.downloadAsync("/123456/d.txt", path.join(tmp, "d.txt")), method: "GET", path: "/123456/d.txt", action: action("download") },
    { name: "downloadBuffer", callback: (cb) => ns.downloadBuffer("/123456/d.txt", cb), async: () => ns.downloadBufferAsync("/123456/d.txt"), method: "GET", path: "/123456/d.txt", action: action("download") },
  ];
};

describe("every public method sends the right request", () => {
  it("the table below covers every public method", () => {
    expect(operations().map((op) => op.name)).toEqual(OPERATION_NAMES);
    const covered = OPERATION_NAMES.flatMap((name) => [name, `${name}Async`]);
    const publicMethods = [
      ...Object.keys(ns).filter((k) => typeof (ns as any)[k] === "function"),
      ...Object.getOwnPropertyNames(Netstorage.prototype).filter(
        (k) => k !== "constructor" && !k.startsWith("build") && typeof (Netstorage.prototype as any)[k] === "function"
      ),
    ];
    expect(new Set(publicMethods)).toEqual(new Set(covered));
    expect(publicMethods).toHaveLength(30);
  });

  for (const form of ["callback", "async"] as const) {
    describe(`${form} form`, () => {
      for (const name of OPERATION_NAMES) {
        it(`${form === "async" ? `${name}Async` : name}`, async () => {
          const op = operations().find((o) => o.name === name)!;
          if (form === "callback") {
            const { err, res } = await viaCallback(op.callback);
            expect(err).toBeNull();
            expect(res!.statusCode).toBe(200);
          } else {
            await op.async();
          }
          expect(mock.requests).toHaveLength(1);
          const req = mock.last;
          expect(req.method).toBe(op.method);
          expect(req.url).toBe(op.path);
          expect(req.headers["x-akamai-acs-action"]).toBe(op.action);
          expect(req.headers["x-akamai-acs-auth-data"]).toMatch(/^5, 0\.0\.0\.0, 0\.0\.0\.0, \d+, \d+, upload-user$/);
          expect(req.signatureValid).toBe(true);
          expect(req.headers["user-agent"]).toBe("NetStorageKit-Node");
          expect(req.headers["accept-encoding"]).toBe("identity");
          expect(req.headers.host).toBe(`127.0.0.1:${mock.port}`);
        });
      }
    });
  }
});

describe("paths and options", () => {
  it("adds a leading slash and escapes the path the same way it is signed", async () => {
    await ns.statAsync("123456/my file.txt");
    expect(mock.last.url).toBe("/123456/my%20file.txt");
    expect(mock.last.signatureValid).toBe(true);
  });

  it("appends dir options as action parameters and skips empty ones", async () => {
    await ns.dirAsync({ path: "/123456", actions: { max_entries: "10", prefix: "img", slash: "both", start: "" } });
    expect(mock.last.headers["x-akamai-acs-action"]).toBe(action("dir&format=xml&max_entries=10&prefix=img&slash=both"));
  });

  it("appends list options as action parameters", async () => {
    await ns.listAsync({ path: "/123456", actions: { max_entries: "2", end: "/123456/z" } });
    expect(mock.last.headers["x-akamai-acs-action"]).toBe(action("list&format=xml&max_entries=2&end=/123456/z"));
  });

  it("rejects invalid dir/list options without sending a request", async () => {
    await expect(ns.dirAsync({ path: "/123456", actions: {} } as any)).rejects.toThrow(/"actions" object/);
    await expect(ns.listAsync({ actions: { end: "x" } } as any)).rejects.toThrow(/"path"/);
    await expect(ns.dirAsync(42 as any)).rejects.toThrow(/string path, or an object/);
    const { err } = await viaCallback((cb) => ns.dir({ path: "/1", actions: {} } as any, cb));
    expect(err.message).toMatch(/"actions" object/);
    const listErr = await viaCallback((cb) => ns.list(42 as any, cb));
    expect(listErr.err.message).toMatch(/string path, or an object/);
    expect(mock.requests).toHaveLength(0);
  });
});

describe("XML responses", () => {
  it("parses dir", async () => {
    mock.reply = () => ({ body: XML.dir });
    expect(await ns.dirAsync("/123456/images")).toEqual({
      stat: {
        attribs: { directory: "/123456/images" },
        file: [
          { type: "dir", name: "thumbs", mtime: "1700000000", bytes: "2048", files: "3" },
          { type: "file", name: "logo.png", mtime: "1700000001", size: "1234", md5: "0cc175b9c0f1b6a831c399e269772661" },
          { type: "symlink", name: "latest.png", mtime: "1700000002", target: "logo.png" },
        ],
      },
    });
  });

  it("parses du", async () => {
    mock.reply = () => ({ body: XML.du });
    expect(await ns.duAsync("/123456")).toEqual({
      du: { attribs: { directory: "/123456" }, "du-info": [{ files: "12", bytes: "3456" }] },
    });
  });

  it("parses stat", async () => {
    mock.reply = () => ({ body: XML.stat });
    const { body } = await viaCallback((cb) => ns.stat("/123456/hello.txt", cb));
    expect(body).toEqual({
      stat: {
        attribs: { directory: "/123456" },
        file: [{ type: "file", name: "hello.txt", mtime: "1700000000", size: "12", md5: "5eb63bbbe01eeed093cb22bb8f5acdc3" }],
      },
    });
  });

  it("parses list, including the resume marker", async () => {
    mock.reply = () => ({ body: XML.list });
    expect(await ns.listAsync("/123456")).toEqual({
      list: {
        file: [{ type: "file", name: "123456/a.txt", size: "1", md5: "0cc175b9c0f1b6a831c399e269772661", mtime: "1700000000" }],
        resume: [{ start: "123456/b.txt" }],
      },
    });
  });

  it("returns a stat without files as attribs only", async () => {
    mock.reply = () => ({ body: `<stat directory="/123456"></stat>` });
    expect(await ns.statAsync("/123456/missing")).toEqual({ stat: { attribs: { directory: "/123456" } } });
  });

  it("wraps non-XML bodies as { message }", async () => {
    mock.reply = () => ({ body: "Request Processed.\n" });
    expect(await ns.mkdirAsync("/123456/new")).toEqual({ message: "Request Processed." });
  });

  it("returns {} for an empty body on non-upload actions", async () => {
    expect(await ns.deleteAsync("/123456/a.txt")).toEqual({});
  });

  it("keeps a <__proto__> element as plain data", async () => {
    mock.reply = () => ({ body: `<__proto__ polluted="yes"><x a="1"/></__proto__>` });
    const result: any = await ns.statAsync("/123456/x");
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.keys(result)).toEqual(["__proto__"]);
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("upload", () => {
  const allBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

  it("sends a file byte for byte", async () => {
    const file = path.join(tmp, "bytes.bin");
    fs.writeFileSync(file, allBytes);
    expect(await ns.uploadAsync(file, "/123456/bytes.bin")).toEqual({ message: "Request Processed." });
    expect(mock.last.body.equals(allBytes)).toBe(true);
  });

  it("sends a buffer byte for byte", async () => {
    const { body } = await viaCallback((cb) => ns.uploadBuffer(allBytes, "bytes.bin", "/123456/bytes.bin", cb));
    expect(body).toEqual({ message: "Request Processed." });
    expect(mock.last.body.equals(allBytes)).toBe(true);
  });

  it("uses the local file name when the destination ends with /", async () => {
    const file = path.join(tmp, "report.csv");
    fs.writeFileSync(file, "a,b");
    await ns.uploadAsync(file, "/123456/reports/");
    expect(mock.last.url).toBe("/123456/reports/report.csv");
    await viaCallback((cb) => ns.upload(file, "/123456/reports/", cb));
    expect(mock.last.url).toBe("/123456/reports/report.csv");
  });

  it("uses basename for buffers when the destination ends with /", async () => {
    await ns.uploadBufferAsync(Buffer.from("x"), "data.json", "/123456/api/");
    expect(mock.last.url).toBe("/123456/api/data.json");
    await viaCallback((cb) => ns.uploadBuffer(Buffer.from("x"), "data.json", "/123456/api/", cb));
    expect(mock.last.url).toBe("/123456/api/data.json");
  });

  it("rejects directories and missing files without sending a request", async () => {
    await expect(ns.uploadAsync(`${tmp}/`, "/123456/x")).rejects.toThrow(/source must be a valid file/);
    await expect(ns.uploadAsync(tmp, "/123456/x")).rejects.toThrow(/You should upload a file/);
    await expect(ns.uploadAsync(path.join(tmp, "nope.txt"), "/123456/x")).rejects.toMatchObject({ code: "ENOENT" });
    expect((await viaCallback((cb) => ns.upload(`${tmp}/`, "/123456/x", cb))).err.message).toMatch(/valid file/);
    expect((await viaCallback((cb) => ns.upload(tmp, "/123456/x", cb))).err.message).toMatch(/upload a file/);
    expect((await viaCallback((cb) => ns.upload(path.join(tmp, "nope"), "/123456/x", cb))).err.code).toBe("ENOENT");
    expect(mock.requests).toHaveLength(0);
  });

  // 1.0.4 (and the official netstorageapi) still ended the request after a body error,
  // sending an empty PUT that could overwrite the destination, and called back twice.
  it("never sends an empty PUT when the body cannot be written", async () => {
    await expect(ns.uploadBufferAsync(undefined as any, "x", "/123456/keep.txt")).rejects.toMatchObject({ code: "ERR_INVALID_ARG_TYPE" });

    const calls: any[] = [];
    ns.uploadBuffer(undefined as any, "x", "/123456/keep.txt", (err) => calls.push(err));
    await new Promise((r) => setTimeout(r, 200));
    expect(calls).toHaveLength(1);
    expect(calls[0].code).toBe("ERR_INVALID_ARG_TYPE");
    expect(mock.requests).toHaveLength(0);
  });

  it("never sends an empty PUT when the file becomes unreadable", async () => {
    const file = path.join(tmp, "locked.txt");
    fs.writeFileSync(file, "data");
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
    });
    await expect(ns.uploadAsync(file, "/123456/keep.txt")).rejects.toMatchObject({ code: "EACCES" });
    const calls: any[] = [];
    ns.upload(file, "/123456/keep.txt", (err) => calls.push(err));
    await new Promise((r) => setTimeout(r, 200));
    expect(calls.map((e) => e.code)).toEqual(["EACCES"]);
    expect(mock.requests).toHaveLength(0);
  });
});

describe("download", () => {
  const allBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

  it("writes the file byte for byte", async () => {
    mock.reply = () => ({ body: allBytes });
    const target = path.join(tmp, "out.bin");
    expect(await ns.downloadAsync("/123456/out.bin", target)).toEqual({ message: "Download Done." });
    expect(fs.readFileSync(target).equals(allBytes)).toBe(true);
  });

  it("keeps the NetStorage file name when the destination is a directory", async () => {
    mock.reply = () => ({ body: "abc" });
    const { body } = await viaCallback((cb) => ns.download("/123456/name.txt", tmp, cb));
    expect(body).toEqual({ message: "Download Done." });
    expect(fs.readFileSync(path.join(tmp, "name.txt"), "utf8")).toBe("abc");
  });

  it("writes to the current directory when no destination is given", async () => {
    mock.reply = () => ({ body: "cwd" });
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      await viaCallback((cb) => (ns.download as any)("/123456/two-args.txt", cb));
      await ns.downloadAsync("/123456/empty-dest.txt", "");
      await (ns.downloadAsync as any)("/123456/no-dest.txt");
    } finally {
      process.chdir(cwd);
    }
    for (const name of ["two-args.txt", "empty-dest.txt", "no-dest.txt"]) {
      expect(fs.readFileSync(path.join(tmp, name), "utf8")).toBe("cwd");
    }
  });

  // Unchanged from 1.0.x: `buffer` holds a binary (latin1) string at runtime, although typed as Buffer.
  it("returns the bytes as a binary string in downloadBuffer", async () => {
    mock.reply = () => ({ body: allBytes });
    const result = await ns.downloadBufferAsync("/123456/out.bin");
    expect(result.message).toBe("Download Done.");
    expect(typeof result.buffer).toBe("string");
    expect(Buffer.from(result.buffer as unknown as string, "binary").equals(allBytes)).toBe(true);
    const { body } = await viaCallback((cb) => ns.downloadBuffer("/123456/out.bin", cb));
    expect(Buffer.from(body.buffer as unknown as string, "binary").equals(allBytes)).toBe(true);
  });

  it("refuses directory paths without sending a request", async () => {
    await expect(ns.downloadAsync("/123456/dir/", tmp)).rejects.toThrow(/cannot download a directory/);
    await expect(ns.downloadBufferAsync("/123456/dir/")).rejects.toThrow(/cannot download a directory/);
    expect((await viaCallback((cb) => ns.download("/123456/dir/", tmp, cb))).err.message).toMatch(/directory/);
    expect((await viaCallback((cb) => (ns.download as any)("/123456/dir/", cb))).err.message).toMatch(/directory/);
    expect((await viaCallback((cb) => ns.downloadBuffer("/123456/dir/", cb))).err.message).toMatch(/directory/);
    expect(mock.requests).toHaveLength(0);
  });

  it("reports local write errors", async () => {
    mock.reply = () => ({ body: "x" });
    const target = path.join(tmp, "missing-dir", "file.txt");
    await expect(ns.downloadAsync("/123456/f.txt", target)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await viaCallback((cb) => ns.download("/123456/f.txt", target, cb))).err.code).toBe("ENOENT");
  });
});

describe("error statuses (behaviour unchanged from 1.0.x)", () => {
  it("passes the HTTP status to callbacks and the body as { message }", async () => {
    mock.reply = () => ({ status: 403, body: "Forbidden\n" });
    const { err, res, body } = await viaCallback((cb) => ns.stat("/123456/secret", cb));
    expect(err).toBeNull();
    expect(res!.statusCode).toBe(403);
    expect(body).toEqual({ message: "Forbidden" });
  });

  it("resolves promise methods with the parsed error body", async () => {
    mock.reply = () => ({ status: 404, body: "<HTML><HEAD><TITLE>Not Found</TITLE></HEAD><BODY>Not Found</BODY></HTML>" });
    expect(await ns.statAsync("/123456/missing")).toEqual({ HTML: { HEAD: [undefined], BODY: [undefined] } });
    mock.reply = () => ({ status: 500, body: "" });
    expect(await ns.uploadBufferAsync(Buffer.from("x"), "x", "/123456/x")).toEqual({});
  });

  it("reports an upload with an empty 200 body as processed", async () => {
    expect(await ns.uploadBufferAsync(Buffer.from("x"), "x", "/123456/x")).toEqual({ message: "Request Processed." });
  });

  it("reports connection errors", async () => {
    const offline = new Netstorage(config({ hostname: "127.0.0.1" }));
    // Nothing listens on port 80 of 127.0.0.1 in CI; the direct connection fails.
    await expect(offline.statAsync("/123456/x")).rejects.toMatchObject({ code: expect.stringMatching(/ECONNREFUSED|EACCES|ECONNRESET/) });
    const { err, res } = await viaCallback((cb) => offline.stat("/123456/x", cb));
    expect(err.code).toMatch(/ECONNREFUSED|EACCES|ECONNRESET/);
    expect(res).toBeNull();
  });
});

// 1.0.4 never settled in this case: the promise stayed pending and the callback was never called.
describe("connection dropped mid-response", () => {
  beforeEach(() => {
    mock.reply = () => ({ dropAfter: "partial" });
  });

  it("rejects promise methods", async () => {
    await expect(ns.statAsync("/123456/x")).rejects.toMatchObject({ code: "ECONNRESET" });
    await expect(ns.downloadBufferAsync("/123456/x.bin")).rejects.toMatchObject({ code: "ECONNRESET" });
  });

  it("calls callbacks once with the error", async () => {
    const calls: any[] = [];
    ns.stat("/123456/x", (err, res) => calls.push([err?.code, res]));
    await new Promise((r) => setTimeout(r, 300));
    expect(calls).toEqual([["ECONNRESET", null]]);
  });

  it("does not write a partial download to disk", async () => {
    const target = path.join(tmp, "partial.bin");
    await expect(ns.downloadAsync("/123456/partial.bin", target)).rejects.toMatchObject({ code: "ECONNRESET" });
    const { err } = await viaCallback((cb) => ns.download("/123456/partial.bin", target, cb));
    expect(err.code).toBe("ECONNRESET");
    expect(fs.existsSync(target)).toBe(false);
  });
});

describe("constructor", () => {
  it("requires hostname, keyName and key", () => {
    for (const missing of ["hostname", "keyName", "key"]) {
      expect(() => new Netstorage(config({ [missing]: "" }))).toThrow(/hostname, keyname and key/);
    }
  });

  it("defaults ssl to false and rejects non-boolean ssl", () => {
    const opts: any = config();
    delete opts.ssl;
    new Netstorage(opts);
    expect(opts.ssl).toBe(false);
    expect(() => new Netstorage(config({ ssl: "yes" }))).toThrow(TypeError);
  });

  it("keeps `requestor` reachable as in 1.0.x", () => {
    expect(typeof ns.requestor.makeRequest).toBe("function");
    expect(typeof ns.requestor.makeAsyncRequest).toBe("function");
  });
});

describe("transport", () => {
  it("uses https when ssl is true", async () => {
    const spy = vi.spyOn(https, "request").mockImplementation(((options: any, cb: any) =>
      http.request({ ...options, host: "127.0.0.1", port: mock.port }, cb)) as any);
    const secure = new Netstorage(config({ ssl: true }));
    await secure.statAsync("/123456/x");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatchObject({ host: HOSTNAME, method: "GET", path: "/123456/x" });
    expect(mock.last.signatureValid).toBe(true);
  });

  it("does not load https-proxy-agent unless a proxy is configured", async () => {
    const { execFileSync } = await import("node:child_process");
    const { distDir } = await import("./mock-netstorage");
    const script = `
      const N = require(${JSON.stringify(distDir + "/netstorage.js")}).default;
      const loaded = () => Object.keys(require.cache).some((k) => k.includes("https-proxy-agent"));
      new N({ hostname: "h", keyName: "k", key: "s", cpCode: "1" });
      const before = loaded();
      new N({ hostname: "h", keyName: "k", key: "s", cpCode: "1", proxy: "http://127.0.0.1:1" });
      console.log(JSON.stringify([before, loaded()]));`;
    expect(JSON.parse(execFileSync(process.execPath, ["-e", script]).toString())).toEqual([false, true]);
  });

  describe("proxy option", () => {
    const proxy = new MockProxy(() => mock.port);
    beforeAll(() => proxy.start());
    afterAll(() => proxy.stop());

    it("tunnels requests through the proxy with CONNECT", async () => {
      proxy.connects = [];
      const viaProxy = new Netstorage(config({ proxy: `http://127.0.0.1:${proxy.port}` }));
      expect(viaProxy.requestor.agent).toBeDefined();
      mock.reply = () => ({ body: XML.du });
      expect(await viaProxy.duAsync("/123456")).toEqual({
        du: { attribs: { directory: "/123456" }, "du-info": [{ files: "12", bytes: "3456" }] },
      });
      const { res } = await viaCallback((cb) => viaProxy.mkdir("/123456/new", cb));
      expect(res!.statusCode).toBe(200);
      expect(proxy.connects).toEqual([`${HOSTNAME}:80`, `${HOSTNAME}:80`]);
      expect(mock.requests.map((r) => [r.method, r.url, r.signatureValid])).toEqual([
        ["GET", "/123456", true],
        ["POST", "/123456/new", true],
      ]);
    });

    it("uses no agent without a proxy", () => {
      expect(ns.requestor.agent).toBeUndefined();
    });
  });
});
