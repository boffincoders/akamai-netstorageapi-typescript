# ts-netstorageapi-akamai

TypeScript client and CLI for the [Akamai NetStorage HTTP API](https://techdocs.akamai.com/netstorage-usage/reference/api) in Node.js.

Upload and download files or in-memory buffers, list and inspect directories, and manage files on NetStorage, with promises or callbacks, full type definitions and a command line tool.

[![npm version](https://img.shields.io/npm/v/ts-netstorageapi-akamai)](https://www.npmjs.com/package/ts-netstorageapi-akamai)
[![CI](https://github.com/boffincoders/akamai-netstorageapi-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/boffincoders/akamai-netstorageapi-typescript/actions/workflows/ci.yml)
[![types: included](https://img.shields.io/badge/types-included-blue)](#typescript)
[![node: >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#node-support)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Maintained by [Boffin Coders](https://boffincoders.com/open-source/akamai-netstorage-typescript?utm_source=npm&utm_medium=readme&utm_campaign=ts-netstorageapi-akamai).

**[Documentation](https://boffincoders.github.io/akamai-netstorageapi-typescript/)** · [Playground](https://boffincoders.github.io/akamai-netstorageapi-typescript/playground/) · [API reference](https://boffincoders.github.io/akamai-netstorageapi-typescript/api/)

## Quick start

```bash
npm install ts-netstorageapi-akamai
```

```ts
import Netstorage from "ts-netstorageapi-akamai";

const ns = new Netstorage({
  hostname: "example-nsu.akamaihd.net",
  keyName: "upload-user",
  key: process.env.NETSTORAGE_KEY!,
  cpCode: "123456",
  ssl: true,
});

await ns.uploadAsync("./build/app.js", "/123456/static/");
const { stat } = await ns.statAsync("/123456/static/app.js");
console.log(stat.file[0].size, stat.file[0].md5);
```

![What happens on every call: your code calls a method, the client builds the request, signs it with HMAC-SHA256, sends it to Akamai NetStorage and parses the XML reply into a typed object](https://raw.githubusercontent.com/boffincoders/akamai-netstorageapi-typescript/master/assets/how-it-works.svg)

> **Upgrading from 1.0.x?** Version 1.1.0 is a drop-in upgrade: your code keeps working without changes. See [what changed](#upgrading-from-10x).

## Contents

- [Why this package](#why-this-package)
- [Features](#features)
- [Configuration](#configuration)
- [Importing](#importing)
- [API at a glance](#api-at-a-glance)
- [Methods](#methods) — [upload](#upload) · [uploadBuffer](#uploadbuffer) · [download](#download) · [downloadBuffer](#downloadbuffer) · [dir](#dir) · [list](#list) · [du](#du) · [stat](#stat) · [mkdir](#mkdir) · [rmdir](#rmdir) · [rename](#rename) · [symlink](#symlink) · [mtime](#mtime) · [delete](#delete) · [quickDelete](#quickdelete)
- [Responses and errors](#responses-and-errors)
- [Proxy](#proxy)
- [Command line](#command-line)
- [Migrating from netstorageapi](#migrating-from-netstorageapi)
- [TypeScript](#typescript)
- [Node support](#node-support)
- [Upgrading from 1.0.x](#upgrading-from-10x)
- [Contributing](#contributing)
- [Credits and license](#credits-and-license)

## Why this package

Akamai's own Node.js client, [`netstorageapi`](https://www.npmjs.com/package/netstorageapi), does the job for callback-style JavaScript, but it has not had a release since 1.1.5 in March 2018. Modern projects need types, `async`/`await`, in-memory transfers and a clean `npm audit`. We built this package to provide them while keeping Akamai's method names, arguments and callback signatures, so switching is usually a one-line change ([see how](#migrating-from-netstorageapi)).

|                                        | `netstorageapi` 1.1.5 (Akamai)                     | `ts-netstorageapi-akamai` 1.1.0                        |
| :------------------------------------- | :------------------------------------------------- | :----------------------------------------------------- |
| TypeScript types                       | None                                               | Config, every method and every response                |
| `async`/`await`                        | Callbacks only                                     | Every method also has a promise (`…Async`) form        |
| Upload or download from memory         | Files only                                         | `uploadBuffer`, `downloadBuffer`                       |
| If a local file can't be read during an upload | Reports the error, then still sends an empty upload, which can overwrite the file on NetStorage | Reports the error once and sends nothing |
| If the connection drops mid-response   | The callback is never called                       | Reports an `ECONNRESET` error                          |
| `npm audit` on a fresh install (Oct 2026) | 2 moderate (xml2js prototype pollution)         | 0                                                      |
| Install size                           | 12 packages, about 1,200 files                     | 8 packages, about 140 files                            |
| Command line tool                      | No                                                 | `akamai-netstorage`                                    |
| Latest release                         | March 2018                                         | Maintained, tested on Node 18, 20 and 22 in CI         |

Both send the same signed requests (HMAC-SHA256, version 5) and return the same parsed responses, so switching does not change what NetStorage sees.

## Features

- **NetStorage operations**: upload, download, dir, list, du, stat, mkdir, rmdir, rename, symlink, mtime, delete and quick-delete.
- **Types** for the configuration, every method and every parsed response.
- **Promises**: each method has an `…Async` twin for `async`/`await`.
- **Buffers**: `uploadBuffer` and `downloadBuffer` move data without temporary files.
- **CommonJS and ESM**: works with `import` in TypeScript and bundlers, and with `require()`.
- **A CLI**: `npx ts-netstorageapi-akamai ls /123456` (see [Command line](#command-line)).
- **Small footprint**: two direct runtime dependencies (`xml2js`, `https-proxy-agent`, the latter loaded only when you set a proxy).
- **Maintenance**: tests against a mock NetStorage server on Node 18, 20 and 22, and dependency updates.

## Configuration

```ts
const ns = new Netstorage({
  hostname: "example-nsu.akamaihd.net", // NetStorage HTTP API hostname
  keyName: "upload-user",               // upload account key name
  key: process.env.NETSTORAGE_KEY!,     // upload account key; keep it out of source control
  cpCode: "123456",                     // your CP code (informational; include it in paths)
  ssl: true,                            // https when true; defaults to false (http)
  proxy: "http://proxy.internal:3128",  // optional
});
```

**New to the NetStorage HTTP API?** The essentials, from Akamai's documentation:

- **`hostname`** is your storage group's connection hostname, always `[domain prefix]-nsu.akamaihd.net`. Find it in Control Center under NetStorage → Storage Groups → **HTTP Domain Name**.
- **`keyName`** is the upload account name, and **`key`** is its HTTP API key: Upload Accounts → Access Methods → **NetStorage HTTP CMS API** → Add HTTP API Key → Copy Key. A new or changed account can take up to 120 minutes to propagate.
- **`cpCode`** is the root of your storage group. Every path starts with it, e.g. `/123456/images/logo.png`.
- **Keep your clock in sync.** Signatures must be within one minute of Akamai's time, or requests fail with 403.
- **Limits:** about 50 writes and 1,000 reads per second per storage group (a `dir` or `list` counts as 10 reads), objects up to 150 GB, paths up to 800 characters.

The [NetStorage basics](https://boffincoders.github.io/akamai-netstorageapi-typescript/basics/) page covers setup, signing, replication and common errors in more detail, with links to Akamai's documentation.

## Importing

```ts
// TypeScript, or JavaScript compiled by Babel, esbuild, webpack and similar
import Netstorage from "ts-netstorageapi-akamai";
```

```js
// CommonJS
const Netstorage = require("ts-netstorageapi-akamai").default;
```

```js
// Native ESM (.mjs or "type": "module") without a bundler
import pkg from "ts-netstorageapi-akamai";
const Netstorage = pkg.default;
```

## API at a glance

![The 15 operations grouped as Transfer, Browse and Manage, each available as a callback method and an Async promise method](https://raw.githubusercontent.com/boffincoders/akamai-netstorageapi-typescript/master/assets/api-map.svg)

Every operation has a callback method and a promise method with the `Async` suffix.

| Callback                                        | Promise                                          | NetStorage action | Resolves with                                   |
| :---------------------------------------------- | :----------------------------------------------- | :---------------- | :---------------------------------------------- |
| `upload(localPath, nsPath, cb)`                 | `uploadAsync(localPath, nsPath)`                 | `upload`          | `{ message: "Request Processed." }`             |
| `uploadBuffer(buffer, fileName, nsPath, cb)`    | `uploadBufferAsync(buffer, fileName, nsPath)`    | `upload`          | `{ message: "Request Processed." }`             |
| `download(nsPath, localPath, cb)`               | `downloadAsync(nsPath, localPath)`               | `download`        | `{ message: "Download Done." }`                 |
| `downloadBuffer(nsPath, cb)`                    | `downloadBufferAsync(nsPath)`                    | `download`        | `{ buffer, message: "Download Done." }`         |
| `dir(nsPath \| options, cb)`                    | `dirAsync(nsPath \| options)`                    | `dir`             | `{ stat: { attribs, file[] } }`                 |
| `list(nsPath \| options, cb)`                   | `listAsync(nsPath \| options)`                   | `list`            | `{ list: { file[], resume[] } }`                |
| `du(nsPath, cb)`                                | `duAsync(nsPath)`                                | `du`              | `{ du: { attribs, "du-info": [{ files, bytes }] } }` |
| `stat(nsPath, cb)`                              | `statAsync(nsPath)`                              | `stat`            | `{ stat: { attribs, file[] } }`                 |
| `mkdir(nsPath, cb)`                             | `mkdirAsync(nsPath)`                             | `mkdir`           | parsed response body                            |
| `rmdir(nsPath, cb)`                             | `rmdirAsync(nsPath)`                             | `rmdir`           | parsed response body                            |
| `rename(nsPath, newNsPath, cb)`                 | `renameAsync(nsPath, newNsPath)`                 | `rename`          | parsed response body                            |
| `symlink(targetNsPath, linkNsPath, cb)`         | `symlinkAsync(targetNsPath, linkNsPath)`         | `symlink`         | parsed response body                            |
| `mtime(nsPath, unixSeconds, cb)`                | `mtimeAsync(nsPath, unixSeconds)`                | `mtime`           | parsed response body                            |
| `delete(nsPath, cb)`                            | `deleteAsync(nsPath)`                            | `delete`          | parsed response body                            |
| `quickDelete(nsDir, cb)`                        | `quickDeleteAsync(nsDir)`                        | `quick-delete`    | parsed response body                            |

Callbacks receive `(err, response, body)`, where `response` is Node's `http.IncomingMessage`.

## Methods

### upload

Uploads a local file. If `nsPath` ends with `/`, the local file name is kept.

```ts
await ns.uploadAsync("./dist/app.js", "/123456/static/app.js");
await ns.uploadAsync("./dist/app.js", "/123456/static/"); // -> /123456/static/app.js

ns.upload("./dist/app.js", "/123456/static/", (err, res, body) => {
  if (err) return console.error(err);
  console.log(res?.statusCode, body); // 200 { message: 'Request Processed.' }
});
```

### uploadBuffer

Uploads a `Buffer`, for content that never touches the disk. `fileName` is used when `nsPath` ends with `/`.

```ts
const json = Buffer.from(JSON.stringify({ version: 42 }));
await ns.uploadBufferAsync(json, "manifest.json", "/123456/api/");

ns.uploadBuffer(json, "manifest.json", "/123456/api/manifest.json", (err, res, body) => {});
```

### download

Downloads a file to disk. `localPath` may be a file or an existing directory; pass `""` to save it under its NetStorage name in the current directory.

```ts
await ns.downloadAsync("/123456/static/app.js", "./tmp/app.js");
await ns.downloadAsync("/123456/static/app.js", "./tmp"); // -> ./tmp/app.js

ns.download("/123456/static/app.js", "", (err, res, body) => {
  if (!err && res?.statusCode !== 200) console.error("NetStorage returned", res?.statusCode);
});
```

The response body is written whatever the HTTP status, so use the callback form or `stat` first if a missing file is possible.

### downloadBuffer

Downloads a file into memory.

```ts
const { buffer } = await ns.downloadBufferAsync("/123456/static/logo.png");
const bytes = Buffer.from(buffer as unknown as string, "binary");
```

`buffer` is typed as `Buffer` but, as in every 1.x release, it holds the bytes as a binary (latin1) string at runtime. Convert it with `Buffer.from(…, "binary")` as above to get a real `Buffer`.

### dir

Lists a directory. Pass a path, or `{ path, actions }` to send extra options.

```ts
const { stat } = await ns.dirAsync("/123456/images");
for (const entry of stat.file) console.log(entry.type, entry.name, entry.size);

const firstPage = await ns.dirAsync({
  path: "/123456/images",
  actions: { max_entries: "100", prefix: "2026-", slash: "both" }, // also start, end, encoding
});
```

### list

Lists files recursively. When more entries remain, `list.resume[0].start` holds the path to continue from.

```ts
const { list } = await ns.listAsync({ path: "/123456", actions: { max_entries: "1000" } });
list.file.forEach((f) => console.log(f.name, f.size));
```

### du

Disk usage of a directory.

```ts
const { du } = await ns.duAsync("/123456");
console.log(du["du-info"][0].files, du["du-info"][0].bytes);
```

### stat

Metadata for a file or directory.

```ts
const { stat } = await ns.statAsync("/123456/static/app.js");
const [file] = stat.file; // { type, name, mtime, size, md5 }
```

### mkdir

```ts
await ns.mkdirAsync("/123456/new-folder");
```

### rmdir

Removes an empty directory.

```ts
await ns.rmdirAsync("/123456/old-folder");
```

### rename

Renames or moves a file.

```ts
await ns.renameAsync("/123456/static/app.js", "/123456/static/app.v2.js");
```

### symlink

Creates a symlink at the second path that points to the first.

```ts
await ns.symlinkAsync("/123456/static/app.v2.js", "/123456/static/app.latest.js");
```

### mtime

Sets the modification time, in whole Unix seconds.

```ts
await ns.mtimeAsync("/123456/static/app.js", Math.floor(Date.now() / 1000));
```

### delete

Deletes a file or symlink.

```ts
await ns.deleteAsync("/123456/static/old.js");
```

### quickDelete

Deletes a directory and everything in it. Akamai has to enable quick-delete on the CP code first.

```ts
await ns.quickDeleteAsync("/123456/cache");
```

## Responses and errors

- XML responses are parsed: each element's attributes become an object, e.g. `body.stat.file[0].name`. All values are strings.
- Plain-text bodies are returned as `{ message }`. An empty `200` upload response becomes `{ message: "Request Processed." }`.
- **HTTP errors do not throw.** Network errors, invalid arguments and local file errors reject the promise (or reach `err` in callbacks), but a `403` or `404` from NetStorage resolves with the parsed error body, as in Akamai's own client. When you need the status code, use the callback form:

```ts
ns.stat("/123456/maybe.txt", (err, res, body) => {
  if (err) throw err;           // network or argument error
  if (res?.statusCode === 404) { /* not found */ }
});
```

## Proxy

Set `proxy` to an `http://` or `https://` proxy URL. Requests are tunnelled with `CONNECT` through [`https-proxy-agent`](https://www.npmjs.com/package/https-proxy-agent), for both `ssl: true` and `ssl: false`.

```ts
const ns = new Netstorage({ ...config, proxy: "http://user:pass@proxy.internal:3128" });
```

## Command line

![Terminal session: upload a file, list a directory, show disk usage and download a file with the akamai-netstorage command](https://raw.githubusercontent.com/boffincoders/akamai-netstorageapi-typescript/master/assets/cli-demo.svg)

The package installs an `akamai-netstorage` command. Credentials come from the environment, never from flags:

```bash
export NETSTORAGE_HOST=example-nsu.akamaihd.net NETSTORAGE_KEYNAME=upload-user NETSTORAGE_KEY=... NETSTORAGE_CPCODE=123456
```

```bash
npx ts-netstorageapi-akamai ls images
```

With `NETSTORAGE_CPCODE` set, paths that do not start with `/` are placed under `/<cpcode>/`.

| Command                                  | Does                                              |
| :--------------------------------------- | :------------------------------------------------ |
| `akamai-netstorage ls <path>`            | List a directory (`--max-entries`, `--prefix`, `--start`, `--end`) |
| `akamai-netstorage list <path>`          | List files recursively                            |
| `akamai-netstorage du <path>`            | File count and bytes used                         |
| `akamai-netstorage stat <path>`          | File or directory metadata                        |
| `akamai-netstorage upload <local> <remote>` | Upload a file                                  |
| `akamai-netstorage download <remote> [local]` | Download a file (written only on success)    |
| `akamai-netstorage cat <remote>`         | Write a file to stdout                            |
| `akamai-netstorage mkdir` / `rmdir` / `rm <path>` | Create, remove, delete                   |
| `akamai-netstorage rename <from> <to>`   | Rename or move                                    |
| `akamai-netstorage symlink <target> <link>` | Create a symlink                               |
| `akamai-netstorage mtime <path> <unix-time>` | Set the modification time                     |
| `akamai-netstorage quick-delete <path> --yes` | Delete a directory tree                      |

Add `--json` for machine-readable output. The CLI uses https unless you pass `--insecure-http`, and takes a proxy from `NETSTORAGE_PROXY`. It exits with `0` on success, `1` on request or HTTP errors and `2` on usage errors. Run `akamai-netstorage --help` for every option.

## Migrating from netstorageapi

The configuration object, method names, arguments and `(err, response, body)` callbacks match Akamai's [`netstorageapi`](https://www.npmjs.com/package/netstorageapi), so in most code only the import changes:

```diff
- const Netstorage = require("netstorageapi");
+ const Netstorage = require("ts-netstorageapi-akamai").default;
```

| netstorageapi                  | ts-netstorageapi-akamai                       |
| :----------------------------- | :-------------------------------------------- |
| `quick_delete(path, cb)`       | `quickDelete(path, cb)`                       |
| callbacks only                 | callbacks, plus `…Async` promise methods      |
| file upload/download only      | plus `uploadBuffer` and `downloadBuffer`      |

All other methods (`dir`, `list`, `download`, `du`, `stat`, `mkdir`, `rmdir`, `mtime`, `delete`, `rename`, `symlink`, `upload`) have the same names and arguments.

## TypeScript

Types ship with the package. The config, option and response types are exported from the entry point:

```ts
import Netstorage, { AkamaiConfig, DirResponse, DirResponseFile, StatResponse } from "ts-netstorageapi-akamai";

const files: DirResponseFile[] = (await ns.dirAsync("/123456")).stat.file;
```

Hover any method in your editor for its documentation. An HTML API reference can be generated from the repository with `npm run docs`.

## Node support

Node.js 18, 20 and 22 are tested in CI. The package is CommonJS and can be loaded with `require()` or `import`.

## Upgrading from 1.0.x

**1.1.0 is a drop-in upgrade. Code that works with 1.0.4 keeps working without changes.**

```bash
npm install ts-netstorageapi-akamai@^1.1.0
```

What stays exactly the same:

- every method name, argument, callback signature and resolved value
- the configuration object, error messages and validation
- the request on the wire: method, path, `X-Akamai-ACS-*` headers and signature, http/https choice, proxy handling
- parsed responses for `dir`, `list`, `du`, `stat`, plain-text and error bodies
- `import Netstorage from "ts-netstorageapi-akamai"`, `require("ts-netstorageapi-akamai").default`, and type imports from `ts-netstorageapi-akamai/dist/...`

What is new in 1.1.0:

- **Security:** `xml2js` upgraded to 0.6.2 and `lodash` removed, so `npm audit` no longer reports this package.
- **Bug fixes:** a failed upload (unreadable file or invalid buffer) no longer sends an empty file to NetStorage, which could overwrite the destination; and a connection that drops in the middle of a response now reports an error instead of leaving the call waiting forever.
- **Smaller package:** the npm tarball is 22 kB instead of 92 kB, and installs about 1,100 fewer files.
- **Additions:** a [CLI](#command-line), exported types and editor documentation for every method.
- **Quality:** a test suite against a mock NetStorage server and CI on Node 18, 20 and 22.

The only differences a 1.0.4 user could observe are fixes to failure cases or depend on how the package was installed:

| Change                                                                      | Who could notice                                                                                  |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| A failed upload reports its error once and sends nothing.                   | Code that hit a local read error. Before, it also got a second callback with the empty upload's response. |
| `downloadAsync(path)` without a destination saves to the current directory. | Code that passed no destination. Before, the call failed.                                         |
| `download("dir/", callback)` passes the error to the callback.              | Code that passed a directory path with two arguments. Before, it threw a `TypeError`.             |
| A connection dropped mid-response reports an `ECONNRESET` error.            | Code that hit a dropped connection. Before, the promise never settled and the callback was never called. |
| `lodash` is no longer installed with this package.                          | Apps that `require("lodash")` without listing it in their own `package.json`. Run `npm install lodash`. |
| `src/` and `docs/` are no longer in the npm tarball.                        | Only imports of `ts-netstorageapi-akamai/src/...`. Import from the package root or `dist/` instead. |
| `"engines": { "node": ">=18" }` is declared.                                 | Installs on Node 16 or older with npm's `engine-strict` setting on. Node 18, 20 and 22 are tested. |

Before release, the whole test suite also ran against the published 1.0.4 code. The results matched except for the fixes listed above. See the [changelog](CHANGELOG.md) for details.

## Contributing

```bash
npm ci
```

```bash
npm run build && npm test
```

Tests run against a local mock NetStorage server; no Akamai account is needed. The README illustrations in `assets/` are generated with `npm run assets` (after a build), and the terminal demo is real output from the CLI. The documentation site is built with `npm run site` into `website/dist` and published to GitHub Pages on every push to master. Please open issues and pull requests on [GitHub](https://github.com/boffincoders/akamai-netstorageapi-typescript).

## Credits and license

This package began as a TypeScript port of Akamai's open-source [`netstorageapi`](https://www.npmjs.com/package/netstorageapi) by Astin Choi, whose request signing and API design it keeps. Thank you.

Released under the [MIT License](LICENSE) © Boffin Coders.

This is an independent open-source project and is not affiliated with or endorsed by Akamai Technologies, Inc. Akamai and NetStorage are trademarks of Akamai Technologies, Inc.
