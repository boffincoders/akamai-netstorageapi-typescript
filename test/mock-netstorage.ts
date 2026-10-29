import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";

const require = createRequire(import.meta.url);
// NS_DIST_DIR lets the same suite run against another build, e.g. the published 1.0.4, to compare behaviour.
const distEntry = path.resolve(process.env.NS_DIST_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist"), "netstorage.js");
if (!fs.existsSync(distEntry)) {
  throw new Error("dist/ is missing. Run `npm run build` before `npm test`.");
}

/** The compiled package, loaded through `.default` as 1.0.x users load it. */
export const Netstorage: typeof import("../src/netstorage").default = require(distEntry).default;
export const distDir = path.dirname(distEntry);

export const KEY = "abcdef0123456789";
export const KEY_NAME = "upload-user";
export const HOSTNAME = "example-nsu.akamaihd.net";

export type RecordedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  signatureValid: boolean;
};

export type Reply = {
  status?: number;
  body?: string | Buffer;
  headers?: http.OutgoingHttpHeaders;
  /** Send the headers and this much of the body, then cut the connection. */
  dropAfter?: string;
};

/**
 * A local stand-in for NetStorage. It records every request, checks the
 * X-Akamai-ACS-Auth-Sign header against the documented v5 algorithm, and answers
 * with whatever `reply` returns for that request.
 */
export class MockNetStorage {
  requests: RecordedRequest[] = [];
  reply: (req: RecordedRequest) => Reply = () => ({ status: 200, body: "" });
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const recorded: RecordedRequest = {
        method: req.method!,
        url: req.url!,
        headers: req.headers,
        body: Buffer.concat(chunks),
        signatureValid: verifySignature(req.url!, req.headers),
      };
      this.requests.push(recorded);
      const { status = 200, body = "", headers = {}, dropAfter } = this.reply(recorded);
      if (dropAfter !== undefined) {
        res.writeHead(status, { "content-length": 100000, ...headers });
        res.write(dropAfter);
        setTimeout(() => res.socket?.destroy(), 20);
        return;
      }
      res.writeHead(status, headers);
      res.end(body);
    });
  });
  port = 0;
  private originalRequest = http.request;

  async start() {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    this.port = (this.server.address() as AddressInfo).port;
    // The client always connects to `hostname` on the default port. Send direct
    // (non-proxied) requests to this mock instead; proxied ones go to the proxy's agent.
    const original = this.originalRequest;
    const port = this.port;
    (http as any).request = function (options: any, callback?: any) {
      if (typeof options === "object" && !options.agent && options.host === HOSTNAME) {
        options = { ...options, host: "127.0.0.1", port };
      }
      return original.call(http, options, callback);
    };
  }

  async stop() {
    (http as any).request = this.originalRequest;
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  reset() {
    this.requests = [];
    this.reply = () => ({ status: 200, body: "" });
  }

  get last() {
    return this.requests[this.requests.length - 1];
  }
}

export function sign(authData: string, urlPath: string, action: string, key = KEY) {
  return crypto.createHmac("sha256", key).update(`${authData}${urlPath}\nx-akamai-acs-action:${action}\n`).digest("base64");
}

function verifySignature(urlPath: string, headers: http.IncomingHttpHeaders) {
  const data = headers["x-akamai-acs-auth-data"] as string;
  const action = headers["x-akamai-acs-action"] as string;
  const signature = headers["x-akamai-acs-auth-sign"] as string;
  if (!data || !action || !signature) return false;
  return sign(data, urlPath, action) === signature;
}

/** Minimal HTTP CONNECT proxy that tunnels every request to `targetPort` on localhost. */
export class MockProxy {
  connects: string[] = [];
  server = http.createServer((_req, res) => res.writeHead(405).end());
  port = 0;

  constructor(private targetPort: () => number) {
    this.server.on("connect", (req, clientSocket: net.Socket, head) => {
      this.connects.push(req.url!);
      const upstream = net.connect(this.targetPort(), "127.0.0.1", () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      upstream.on("error", () => clientSocket.destroy());
      clientSocket.on("error", () => upstream.destroy());
    });
  }

  async start() {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  async stop() {
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

export const config = (extra: Record<string, unknown> = {}) => ({
  hostname: HOSTNAME,
  keyName: KEY_NAME,
  key: KEY,
  cpCode: "123456",
  ssl: false,
  ...extra,
});

/** Calls a callback-style method and resolves with its arguments. */
export function viaCallback<B = any>(invoke: (cb: (err: any, res?: http.IncomingMessage, body?: B) => void) => void) {
  return new Promise<{ err: any; res?: http.IncomingMessage; body?: B }>((resolve) => {
    invoke((err, res, body) => resolve({ err, res, body }));
  });
}

export const XML = {
  dir: `<?xml version="1.0" encoding="ISO-8859-1"?>
<stat directory="/123456/images">
<file type="dir" name="thumbs" mtime="1700000000" bytes="2048" files="3"/>
<file type="file" name="logo.png" mtime="1700000001" size="1234" md5="0cc175b9c0f1b6a831c399e269772661"/>
<file type="symlink" name="latest.png" mtime="1700000002" target="logo.png"/>
</stat>
`,
  du: `<?xml version="1.0" encoding="ISO-8859-1"?>
<du directory="/123456">
<du-info files="12" bytes="3456"/>
</du>
`,
  stat: `<?xml version="1.0" encoding="ISO-8859-1"?>
<stat directory="/123456">
<file type="file" name="hello.txt" mtime="1700000000" size="12" md5="5eb63bbbe01eeed093cb22bb8f5acdc3"/>
</stat>
`,
  list: `<?xml version="1.0" encoding="ISO-8859-1"?>
<list>
<file type="file" name="123456/a.txt" size="1" md5="0cc175b9c0f1b6a831c399e269772661" mtime="1700000000"/>
<resume start="123456/b.txt"/>
</list>
`,
};
