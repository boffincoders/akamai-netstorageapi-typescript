// Content for the documentation site. One entry per operation; build.mjs turns
// each into a page and the playground reuses `action`, `http` and `inputs`.

export const site = {
  name: "ts-netstorageapi-akamai",
  url: "https://boffincoders.github.io/akamai-netstorageapi-typescript/",
  repo: "https://github.com/boffincoders/akamai-netstorageapi-typescript",
  npm: "https://www.npmjs.com/package/ts-netstorageapi-akamai",
  maintainer: "https://boffincoders.com/open-source/akamai-netstorage-typescript?utm_source=docs&utm_medium=site&utm_campaign=ts-netstorageapi-akamai",
  tagline: "TypeScript client and CLI for the Akamai NetStorage HTTP API",
  description:
    "Typed, promise-based Node.js client and CLI for the Akamai NetStorage HTTP API: upload and download files or buffers, dir, list, du, stat, mkdir, rmdir, rename, symlink, mtime, delete and quick-delete.",
};

export const groups = [
  { id: "transfer", title: "Transfer" },
  { id: "browse", title: "Browse" },
  { id: "manage", title: "Manage" },
];

const cb = (type) => `callback: (err: any, res?: http.IncomingMessage, body?: ${type}) => void`;

export const methods = [
  {
    name: "upload",
    group: "transfer",
    summary: "Upload a local file to NetStorage.",
    http: "PUT",
    action: "upload",
    params: [
      ["local_source", "string", "Path of the local file."],
      ["ns_destination", "string", "NetStorage path. End it with `/` to keep the local file name."],
    ],
    callbackSig: `upload(local_source: string, ns_destination: string, ${cb("UploadResponse")}): void`,
    asyncSig: "uploadAsync(local_source: string, ns_destination: string): Promise<UploadResponse>",
    returns: "UploadResponse",
    result: `{ message: "Request Processed." }`,
    example: `await ns.uploadAsync("./dist/app.js", "/123456/static/");
// uploaded as /123456/static/app.js`,
    callbackExample: `ns.upload("./dist/app.js", "/123456/static/app.js", (err, res, body) => {
  if (err) return console.error(err);
  console.log(res?.statusCode, body); // 200 { message: 'Request Processed.' }
});`,
    cli: "akamai-netstorage upload ./dist/app.js static/",
    notes: [
      "Directories cannot be uploaded; pass a file.",
      "If the local file cannot be read, the error is reported and nothing is sent.",
      "The file is read into memory before it is sent. NetStorage accepts objects up to 150 GB; split files over 100 GB into parts.",
      "Uploads count as writes: about 50 per second per storage group.",
    ],
    inputs: ["path"],
  },
  {
    name: "uploadBuffer",
    group: "transfer",
    summary: "Upload a Buffer, for content that never touches the disk.",
    http: "PUT",
    action: "upload",
    params: [
      ["local_source", "Buffer", "File contents."],
      ["basename", "string", "File name used when `ns_destination` ends with `/`."],
      ["ns_destination", "string", "NetStorage path or directory ending with `/`."],
    ],
    callbackSig: `uploadBuffer(local_source: Buffer, basename: string, ns_destination: string, ${cb("UploadResponse")}): void`,
    asyncSig: "uploadBufferAsync(local_source: Buffer, basename: string, ns_destination: string): Promise<UploadResponse>",
    returns: "UploadResponse",
    result: `{ message: "Request Processed." }`,
    example: `const manifest = Buffer.from(JSON.stringify({ version: 42 }));
await ns.uploadBufferAsync(manifest, "manifest.json", "/123456/api/");`,
    callbackExample: `ns.uploadBuffer(manifest, "manifest.json", "/123456/api/manifest.json", (err, res, body) => {
  if (!err) console.log(res?.statusCode);
});`,
    cli: null,
    notes: ["Useful for generated files such as JSON feeds or rendered images."],
    inputs: ["path"],
  },
  {
    name: "download",
    group: "transfer",
    summary: "Download a file from NetStorage to the local disk.",
    http: "GET",
    action: "download",
    params: [
      ["ns_path", "string", "NetStorage file path (not a directory)."],
      ["local_destination", "string", 'Local file or existing directory. Pass `""` to save under the NetStorage name in the current directory.'],
    ],
    callbackSig: `download(ns_path: string, local_destination: string, ${cb("DownloadResponse")}): void`,
    asyncSig: "downloadAsync(ns_path: string, local_destination: string): Promise<DownloadResponse>",
    returns: "DownloadResponse",
    result: `{ message: "Download Done." }`,
    example: `await ns.downloadAsync("/123456/static/app.js", "./backup/");
// saved as ./backup/app.js`,
    callbackExample: `ns.download("/123456/static/app.js", "./app.js", (err, res) => {
  if (!err && res?.statusCode !== 200) console.error("NetStorage returned", res?.statusCode);
});`,
    cli: "akamai-netstorage download static/app.js backup/",
    notes: [
      "The response body is written whatever the HTTP status; use the callback form or `stat` first if the file may be missing.",
      "If the connection drops before the file is complete, an `ECONNRESET` error is reported and nothing is written.",
      "The file is held in memory before it is written. Akamai recommends not downloading files over 1 GB through the HTTP API; serve them through a delivery product instead.",
    ],
    inputs: ["path"],
  },
  {
    name: "downloadBuffer",
    group: "transfer",
    summary: "Download a file into memory.",
    http: "GET",
    action: "download",
    params: [["ns_path", "string", "NetStorage file path (not a directory)."]],
    callbackSig: `downloadBuffer(ns_path: string, ${cb("DownloadBufferResponse")}): void`,
    asyncSig: "downloadBufferAsync(ns_path: string): Promise<DownloadBufferResponse>",
    returns: "DownloadBufferResponse",
    result: `{ buffer, message: "Download Done." }`,
    example: `const { buffer } = await ns.downloadBufferAsync("/123456/static/logo.png");
const bytes = Buffer.from(buffer as unknown as string, "binary");`,
    callbackExample: `ns.downloadBuffer("/123456/static/logo.png", (err, res, body) => {
  if (!err) fs.writeFileSync("logo.png", Buffer.from(body!.buffer as unknown as string, "binary"));
});`,
    cli: "akamai-netstorage cat static/app.js",
    notes: [
      "`buffer` is typed as `Buffer` but, as in every 1.x release, holds the bytes as a binary (latin1) string. Convert it with `Buffer.from(…, \"binary\")`.",
    ],
    inputs: ["path"],
  },
  {
    name: "dir",
    group: "browse",
    summary: "List the entries of one directory.",
    http: "GET",
    action: "dir&format=xml",
    params: [["opts", "string | DirListOpts", "A path, or `{ path, actions }` with `max_entries`, `prefix`, `start`, `end`, `encoding` or `slash`."]],
    callbackSig: `dir(opts: DirListOpts | string, ${cb("DirResponse")}): void`,
    asyncSig: "dirAsync(opts: DirListOpts | string): Promise<DirResponse>",
    returns: "DirResponse",
    result: `{ stat: { attribs: { directory }, file: [{ type, name, size?, md5?, mtime, bytes?, files?, target? }] } }`,
    example: `const { stat } = await ns.dirAsync({
  path: "/123456/images",
  actions: { max_entries: "100", prefix: "2026-" },
});
for (const entry of stat.file) console.log(entry.type, entry.name, entry.size);`,
    callbackExample: `ns.dir("/123456/images", (err, res, body) => {
  if (!err) console.log(body?.stat.file.map((f) => f.name));
});`,
    cli: "akamai-netstorage ls images --max-entries 100",
    notes: [
      "All values are strings, as NetStorage returns them.",
      "`type` is `file`, `dir` or `symlink`.",
      "Each `dir` call counts as 10 reads toward NetStorage's rate limits; page through large directories with `max_entries`.",
    ],
    inputs: ["path", "dirOptions"],
  },
  {
    name: "list",
    group: "browse",
    summary: "List files recursively, with a marker to resume long listings.",
    http: "GET",
    action: "list&format=xml",
    params: [["opts", "string | DirListOpts", "A path, or `{ path, actions }` with `max_entries`, `end`, `encoding` or `mtime_all`."]],
    callbackSig: `list(opts: DirListOpts | string, ${cb("ListResponse")}): void`,
    asyncSig: "listAsync(opts: DirListOpts | string): Promise<ListResponse>",
    returns: "ListResponse",
    result: `{ list: { file: [{ type, name, size, md5, mtime }], resume: [{ start }] } }`,
    example: `const { list } = await ns.listAsync({ path: "/123456", actions: { max_entries: "1000" } });
list.file.forEach((f) => console.log(f.name, f.size));
const next = list.resume?.[0]?.start; // continue from here when present`,
    callbackExample: `ns.list("/123456", (err, res, body) => {
  if (!err) console.log(body?.list.file.length);
});`,
    cli: "akamai-netstorage list static --max-entries 1000",
    notes: [
      "Names in the result are full paths relative to the CP code root.",
      "Each `list` call counts as 10 reads toward NetStorage's rate limits.",
    ],
    inputs: ["path", "listOptions"],
  },
  {
    name: "du",
    group: "browse",
    summary: "Show the number of files and bytes used under a directory.",
    http: "GET",
    action: "du&format=xml",
    params: [["ns_path", "string", "NetStorage directory path."]],
    callbackSig: `du(ns_path: string, ${cb("DuResponse")}): void`,
    asyncSig: "duAsync(ns_path: string): Promise<DuResponse>",
    returns: "DuResponse",
    result: `{ du: { attribs: { directory }, "du-info": [{ files, bytes }] } }`,
    example: `const { du } = await ns.duAsync("/123456");
console.log(du["du-info"][0].files, du["du-info"][0].bytes);`,
    callbackExample: `ns.du("/123456", (err, res, body) => {
  if (!err) console.log(body?.du["du-info"][0].bytes);
});`,
    cli: "akamai-netstorage du static",
    notes: [],
    inputs: ["path"],
  },
  {
    name: "stat",
    group: "browse",
    summary: "Get details of a file or directory.",
    http: "GET",
    action: "stat&format=xml",
    params: [["ns_path", "string", "NetStorage path."]],
    callbackSig: `stat(ns_path: string, ${cb("StatResponse")}): void`,
    asyncSig: "statAsync(ns_path: string): Promise<StatResponse>",
    returns: "StatResponse",
    result: `{ stat: { attribs: { directory }, file: [{ type, name, mtime, size?, md5? }] } }`,
    example: `const { stat } = await ns.statAsync("/123456/static/app.js");
const [file] = stat.file;
console.log(file.size, file.md5);`,
    callbackExample: `ns.stat("/123456/maybe.txt", (err, res, body) => {
  if (res?.statusCode === 404) console.log("not found");
});`,
    cli: "akamai-netstorage stat static/app.js",
    notes: ["A missing path returns HTTP 404; use the callback form to read the status code."],
    inputs: ["path"],
  },
  {
    name: "mkdir",
    group: "manage",
    summary: "Create a directory.",
    http: "POST",
    action: "mkdir",
    params: [["ns_path", "string", "Full path of the new directory."]],
    callbackSig: `mkdir(ns_path: string, ${cb("MkdirResponse")}): void`,
    asyncSig: "mkdirAsync(ns_path: string): Promise<MkdirResponse>",
    returns: "MkdirResponse",
    result: "parsed response body",
    example: `await ns.mkdirAsync("/123456/releases/2026-10");`,
    callbackExample: `ns.mkdir("/123456/releases/2026-10", (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage mkdir releases/2026-10",
    notes: [],
    inputs: ["path"],
  },
  {
    name: "rmdir",
    group: "manage",
    summary: "Remove an empty directory.",
    http: "POST",
    action: "rmdir",
    params: [["ns_path", "string", "Full path of the directory."]],
    callbackSig: `rmdir(ns_path: string, ${cb("RmdirResponse")}): void`,
    asyncSig: "rmdirAsync(ns_path: string): Promise<RmdirResponse>",
    returns: "RmdirResponse",
    result: "parsed response body",
    example: `await ns.rmdirAsync("/123456/releases/old");`,
    callbackExample: `ns.rmdir("/123456/releases/old", (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage rmdir releases/old",
    notes: ["The directory must be empty; use quickDelete for a whole tree."],
    inputs: ["path"],
  },
  {
    name: "rename",
    group: "manage",
    summary: "Rename or move a file.",
    http: "POST",
    action: "rename&destination=",
    params: [
      ["ns_target", "string", "Current path."],
      ["ns_destination", "string", "New path."],
    ],
    callbackSig: `rename(ns_target: string, ns_destination: string, ${cb("RenameResponse")}): void`,
    asyncSig: "renameAsync(ns_target: string, ns_destination: string): Promise<RenameResponse>",
    returns: "RenameResponse",
    result: "parsed response body",
    example: `await ns.renameAsync("/123456/static/app.js", "/123456/static/app.v2.js");`,
    callbackExample: `ns.rename("/123456/a.txt", "/123456/b.txt", (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage rename static/app.js static/app.v2.js",
    notes: ["The destination is URL-encoded into the action header."],
    inputs: ["path", "destination"],
  },
  {
    name: "symlink",
    group: "manage",
    summary: "Create a symlink that points to an existing file.",
    http: "POST",
    action: "symlink&target=",
    params: [
      ["ns_target", "string", "Existing file the link points to."],
      ["ns_destination", "string", "Path of the new link."],
    ],
    callbackSig: `symlink(ns_target: string, ns_destination: string, ${cb("SymlinkResponse")}): void`,
    asyncSig: "symlinkAsync(ns_target: string, ns_destination: string): Promise<SymlinkResponse>",
    returns: "SymlinkResponse",
    result: "parsed response body",
    example: `await ns.symlinkAsync("/123456/static/app.v2.js", "/123456/static/app.latest.js");`,
    callbackExample: `ns.symlink("/123456/a.txt", "/123456/latest.txt", (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage symlink static/app.v2.js static/app.latest.js",
    notes: ["The request goes to the link path; the target is URL-encoded into the action header."],
    inputs: ["path", "target"],
  },
  {
    name: "mtime",
    group: "manage",
    summary: "Set the modification time of a file.",
    http: "POST",
    action: "mtime&format=xml&mtime=",
    params: [
      ["ns_path", "string", "NetStorage file path."],
      ["mtime", "number", "Unix time in whole seconds."],
    ],
    callbackSig: `mtime(ns_path: string, mtime: number, ${cb("MtimeResponse")}): void`,
    asyncSig: "mtimeAsync(ns_path: string, mtime: number): Promise<MtimeResponse>",
    returns: "MtimeResponse",
    result: "parsed response body",
    example: `await ns.mtimeAsync("/123456/static/app.js", Math.floor(Date.now() / 1000));`,
    callbackExample: `ns.mtime("/123456/a.txt", 1793250000, (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage mtime static/app.js 1793250000",
    notes: ["Milliseconds are not supported."],
    inputs: ["path", "mtime"],
  },
  {
    name: "delete",
    group: "manage",
    summary: "Delete a file or symlink.",
    http: "POST",
    action: "delete",
    params: [["ns_path", "string", "Full path of the file."]],
    callbackSig: `delete(ns_path: string, ${cb("DeleteResponse")}): void`,
    asyncSig: "deleteAsync(ns_path: string): Promise<DeleteResponse>",
    returns: "DeleteResponse",
    result: "parsed response body",
    example: `await ns.deleteAsync("/123456/static/old.js");`,
    callbackExample: `ns.delete("/123456/static/old.js", (err, res) => {
  if (res?.statusCode === 200) console.log("deleted");
});`,
    cli: "akamai-netstorage rm static/old.js",
    notes: [],
    inputs: ["path"],
  },
  {
    name: "quickDelete",
    group: "manage",
    summary: "Delete a directory and everything in it.",
    http: "POST",
    action: "quick-delete&quick-delete=imreallyreallysure",
    params: [["ns_path", "string", "Full path of the directory."]],
    callbackSig: `quickDelete(ns_path: string, ${cb("QuickDeleteResponse")}): void`,
    asyncSig: "quickDeleteAsync(ns_path: string): Promise<QuickDeleteResponse>",
    returns: "QuickDeleteResponse",
    result: "parsed response body",
    example: `await ns.quickDeleteAsync("/123456/cache");`,
    callbackExample: `ns.quickDelete("/123456/cache", (err, res) => console.log(res?.statusCode));`,
    cli: "akamai-netstorage quick-delete cache --yes",
    notes: ["Akamai must enable quick-delete on the CP code first.", "This cannot be undone."],
    inputs: ["path"],
  },
];
