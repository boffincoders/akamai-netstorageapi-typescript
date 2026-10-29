import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { distDir, KEY, KEY_NAME, sign } from "./mock-netstorage";

const require = createRequire(import.meta.url);
const Auth = require(path.join(distDir, "api-auth.js")).default;

// Fixed inputs: 2023-11-14T22:13:20.123Z and Math.random() = 0.4242 (nonce 42420).
// The expected signature was produced by Akamai's official `netstorageapi` 1.1.5 with the same inputs.
const FIXED_NOW = 1700000000123;
const GOLDEN = {
  acs_auth_data: "5, 0.0.0.0, 0.0.0.0, 1700000000, 42420, upload-user",
  acs_auth_sign: "OTQgK3Rx2GNsMKKJsjMGxneU6I7yTvdtOtyUTFe+QJ8=",
};

describe("Auth (X-Akamai-ACS-Auth-Data / X-Akamai-ACS-Auth-Sign, version 5)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("matches the official netstorageapi signature for a fixed time and nonce", () => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    vi.spyOn(Math, "random").mockReturnValue(0.4242);
    const auth = new Auth({ key: KEY, keyName: KEY_NAME });
    expect(auth.auth("/123456/dir/file.txt", "version=1&action=upload")).toEqual(GOLDEN);
  });

  it("formats auth data as `5, 0.0.0.0, 0.0.0.0, <unix seconds>, <nonce>, <key name>`", () => {
    const auth = new Auth({ key: KEY, keyName: KEY_NAME });
    const { acs_auth_data } = auth.auth("/123456/x", "version=1&action=stat&format=xml");
    expect(acs_auth_data).toMatch(/^5, 0\.0\.0\.0, 0\.0\.0\.0, \d{10}, \d{1,5}, upload-user$/);
    const seconds = Number(acs_auth_data.split(", ")[3]);
    expect(Math.abs(seconds - Date.now() / 1000)).toBeLessThan(5);
  });

  it("signs HMAC-SHA256(key, authData + path + '\\nx-akamai-acs-action:' + action + '\\n') in base64", () => {
    const auth = new Auth({ key: KEY, keyName: KEY_NAME });
    const action = "version=1&action=dir&format=xml";
    const { acs_auth_data, acs_auth_sign } = auth.auth("/123456/images", action);
    expect(acs_auth_sign).toBe(sign(acs_auth_data, "/123456/images", action));
    expect(Buffer.from(acs_auth_sign, "base64")).toHaveLength(32);
  });

  it("requires key and keyName", () => {
    expect(() => new Auth({ key: "", keyName: KEY_NAME })).toThrow(/key and keyName/);
    expect(() => new Auth({ key: KEY, keyName: "" })).toThrow(/key and keyName/);
  });
});
