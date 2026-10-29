# Changelog

All notable changes to this package are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.1] - 2026-10-29

Documentation only. The code is the same as 1.1.0: the compiled files in the package are identical, so there is nothing to change or test when upgrading.

### Changed

- README: the Boffin Coders logo next to "Maintained by", an "About Boffin Coders" section with links to the maintainer and the sister package fundamental-analysis, and Node.js 24 in the list of versions tested in CI. The illustrations use the Boffin Coders colours.

## [1.1.0] - 2026-10-29

A drop-in upgrade from 1.0.x: no method, argument, callback signature or return value has changed, and code that works with 1.0.4 keeps working. The full test suite was run against the published 1.0.4 code as well; results matched except for the fixes below. The README's [Upgrading from 1.0.x](README.md#upgrading-from-10x) section lists every difference and who could notice it.

If your app uses `lodash` without listing it in its own `package.json`, it may have been getting it through this package: add it with `npm install lodash`.

### Security

- Upgraded `xml2js` from 0.4.23 to 0.6.2, which fixes the prototype pollution advisory [GHSA-776f-qx25-q3cc](https://github.com/advisories/GHSA-776f-qx25-q3cc). Parsed responses are unchanged.
- Removed the `lodash` dependency (it carried high severity advisories). `npm audit --omit=dev` now reports 0 vulnerabilities, down from 2.

### Fixed

- Uploads no longer send an empty `PUT` when the local file cannot be read or the buffer is invalid. Previously the error was reported but the request was still sent with no body, which could overwrite the destination with an empty file, and callbacks were called twice.
- `downloadAsync(path)` without a destination now saves the file under its NetStorage name in the current directory, as documented, instead of failing.
- `download(path, callback)` with a directory path now passes the error to the callback instead of throwing.
- A connection that drops in the middle of a response now rejects the promise (or calls the callback once) with an `ECONNRESET` error. Previously the promise never settled and the callback was never called, so the caller waited forever. A partial download is not written to disk.
- The README's CommonJS example now shows `require("ts-netstorageapi-akamai").default`, which is how the package has always been loaded.
- `requestor` is public again in the type definitions, as it was in 1.0.4.
- The type definitions no longer need `@types/xml2js`, so strict projects with `skipLibCheck: false` compile without extra packages.

### Added

- `akamai-netstorage` command line tool (`npx ts-netstorageapi-akamai --help`).
- Config, option and response types exported from the package entry, e.g. `import { AkamaiConfig, DirResponse, DirResponseFile } from "ts-netstorageapi-akamai"`.
- Optional `target` on directory entries (symlinks) and `size` and `md5` on `stat` entries, which NetStorage already returned.
- JSDoc for every method, shown in editors, and a TypeDoc API reference (`npm run docs`).
- Documentation site on GitHub Pages: NetStorage basics for first-time users (endpoint, keys, signing, limits, common errors), a guide, a page per method, the CLI, migration and upgrade notes, a request playground that builds and signs a request in the browser and shows the matching `curl` command, an XML explorer and the TypeDoc API reference (`npm run site`; not part of the npm package).
- README illustrations: how a call works, all operations at a glance, and a CLI demo built from real CLI output (`npm run assets`; not part of the npm package).
- Test suite against a local mock NetStorage server and CI on Node 18, 20 and 22.

### Changed

- Smaller package: the tarball now contains only the compiled JavaScript, type definitions, README, LICENSE and CHANGELOG. Sources, docs and the stray `netstorage.zip` are gone.
- `https-proxy-agent` is loaded only when a `proxy` is configured.
- Compiled for ES2022 (Node 18+). Declared `"engines": { "node": ">=18" }`.

## [1.0.4] - 2022-01-04

Last release before this changelog. See the [git history](https://github.com/boffincoders/akamai-netstorageapi-typescript/commits/master).

[1.1.1]: https://github.com/boffincoders/akamai-netstorageapi-typescript/releases/tag/v1.1.1
[1.1.0]: https://github.com/boffincoders/akamai-netstorageapi-typescript/releases/tag/v1.1.0
[1.0.4]: https://www.npmjs.com/package/ts-netstorageapi-akamai/v/1.0.4
