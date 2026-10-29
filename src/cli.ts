#!/usr/bin/env node
import fs from "fs";
import http from "http";
import path from "path";
import Netstorage from "./netstorage";

const USAGE = `Usage: akamai-netstorage <command> [arguments] [options]

Commands:
  dir <path>                  List a directory (alias: ls)
  list <path>                 List files recursively
  du <path>                   Show file count and bytes used
  stat <path>                 Show file or directory metadata
  upload <local> <remote>     Upload a file (remote ending in / keeps the file name)
  download <remote> [local]   Download a file
  cat <remote>                Write a file to stdout
  mkdir <path>                Create a directory
  rmdir <path>                Remove an empty directory
  delete <path>               Delete a file or symlink (alias: rm)
  rename <from> <to>          Rename or move a file
  symlink <target> <link>     Create a symlink at <link> pointing to <target>
  mtime <path> <unix-time>    Set the modification time
  quick-delete <path> --yes   Delete a directory and its contents (must be enabled on the CP code)

Options:
  --json                Print the parsed response as JSON
  --max-entries <n>     dir, list: limit the number of entries
  --prefix <prefix>     dir: only entries starting with <prefix>
  --start <path>        dir: start from <path>
  --end <path>          dir, list: stop at <path>
  --host <hostname>     Overrides NETSTORAGE_HOST
  --key-name <name>     Overrides NETSTORAGE_KEYNAME
  --cp-code <code>      Overrides NETSTORAGE_CPCODE
  --insecure-http       Use http instead of https
  -h, --help            Show this help
  -v, --version         Show the version

Environment:
  NETSTORAGE_HOST       NetStorage hostname, e.g. example-nsu.akamaihd.net
  NETSTORAGE_KEYNAME    Upload account key name
  NETSTORAGE_KEY        Upload account key (read from the environment only)
  NETSTORAGE_CPCODE     Optional. Paths that do not start with / are placed under /<cpcode>/
  NETSTORAGE_PROXY      Optional proxy URL, e.g. http://proxy.internal:3128

Exit codes: 0 success, 1 request or HTTP error, 2 usage error.`;

const VALUE_OPTIONS = ["max-entries", "prefix", "start", "end", "host", "key-name", "cp-code"];
const FLAG_OPTIONS = ["json", "yes", "insecure-http", "help", "version"];

class UsageError extends Error {}

type Parsed = { positionals: string[]; options: Record<string, string | boolean> };

function parseArgs(argv: string[]): Parsed {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h") options.help = true;
    else if (arg === "-v") options.version = true;
    else if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    } else if (arg.startsWith("--")) {
      const [name, inline] = arg.slice(2).split(/=(.*)/s, 2);
      if (FLAG_OPTIONS.includes(name)) options[name] = true;
      else if (VALUE_OPTIONS.includes(name)) {
        const value = inline !== undefined ? inline : argv[++i];
        if (value === undefined) throw new UsageError(`--${name} needs a value`);
        options[name] = value;
      } else throw new UsageError(`Unknown option --${name}`);
    } else positionals.push(arg);
  }
  return { positionals, options };
}

type Result = { res?: http.IncomingMessage; body?: any };

function call(invoke: (cb: (err: any, res?: http.IncomingMessage, body?: any) => void) => void): Promise<Result> {
  return new Promise((resolve, reject) => {
    invoke((err, res, body) => (err ? reject(err) : resolve({ res, body })));
  });
}

function formatEntries(files: any[] = []) {
  return files
    .map((f) => {
      // Directories report their total bytes; `du` gives the file count.
      const size = (f.type === "dir" ? f.bytes : f.size) || "";
      const when = f.mtime ? new Date(Number(f.mtime) * 1000).toISOString().replace(".000Z", "Z") : "";
      const name = f.type === "dir" ? `${f.name}/` : f.type === "symlink" && f.target ? `${f.name} -> ${f.target}` : f.name;
      return [f.type.padEnd(7), String(size).padStart(12), when.padEnd(20), name].join("  ");
    })
    .join("\n");
}

export async function run(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const { positionals, options } = parseArgs(argv);
  if (options.version) {
    process.stdout.write(`${require("../package.json").version}\n`);
    return 0;
  }
  const [command, ...args] = positionals;
  if (options.help || !command) {
    process.stdout.write(`${USAGE}\n`);
    return options.help ? 0 : 2;
  }

  const hostname = (options.host as string) || env.NETSTORAGE_HOST;
  const keyName = (options["key-name"] as string) || env.NETSTORAGE_KEYNAME;
  const key = env.NETSTORAGE_KEY;
  const cpCode = (options["cp-code"] as string) || env.NETSTORAGE_CPCODE || "";
  if (!hostname || !keyName || !key) {
    throw new UsageError("Set NETSTORAGE_HOST, NETSTORAGE_KEYNAME and NETSTORAGE_KEY (see --help)");
  }
  const proxy = env.NETSTORAGE_PROXY;
  const ns = new Netstorage({ hostname, keyName, key, cpCode, ssl: !options["insecure-http"], ...(proxy && { proxy }) });

  const remote = (p: string | undefined, label = "path") => {
    if (!p) throw new UsageError(`${command}: missing ${label}`);
    return p.startsWith("/") || !cpCode ? p : `/${cpCode}/${p}`;
  };
  const listActions = (keys: string[]) => {
    const actions: Record<string, string> = {};
    for (const k of keys) if (typeof options[k] === "string") actions[k.replace("-", "_")] = options[k] as string;
    return actions;
  };
  const withActions = (p: string, actions: Record<string, string>) => (Object.keys(actions).length ? { path: p, actions } : p);

  let result: Result;
  let print: (body: any) => string = () => "";
  switch (command) {
    case "dir":
    case "ls":
      result = await call((cb) => ns.dir(withActions(remote(args[0]), listActions(["max-entries", "prefix", "start", "end"])), cb));
      print = (b) => formatEntries(b.stat?.file);
      break;
    case "list":
      result = await call((cb) => ns.list(withActions(remote(args[0]), listActions(["max-entries", "end"])), cb));
      print = (b) => {
        const lines = (b.list?.file || []).map((f: any) => `${String(f.size ?? "").padStart(12)}  ${f.name}`);
        if (b.list?.resume?.[0]?.start) lines.push(`(more: --start ${b.list.resume[0].start})`);
        return lines.join("\n");
      };
      break;
    case "du":
      result = await call((cb) => ns.du(remote(args[0]), cb));
      print = (b) => {
        const info = b.du?.["du-info"]?.[0] || {};
        return `${info.files} files, ${info.bytes} bytes in ${b.du?.attribs?.directory}`;
      };
      break;
    case "stat":
      result = await call((cb) => ns.stat(remote(args[0]), cb));
      print = (b) => formatEntries(b.stat?.file);
      break;
    case "upload":
      if (!args[0]) throw new UsageError("upload: missing local file");
      result = await call((cb) => ns.upload(args[0], remote(args[1], "remote path"), cb));
      break;
    case "download": {
      // Downloads into memory and writes the file only on success, so an error page never lands on disk.
      const source = remote(args[0]);
      result = await call((cb) => ns.downloadBuffer(source, cb));
      if (result.res!.statusCode! < 400) {
        let target = args[1] || path.basename(source);
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, path.basename(source));
        fs.writeFileSync(target, Buffer.from(result.body.buffer as string, "binary"));
        print = () => `Saved ${target}`;
      }
      break;
    }
    case "cat":
      result = await call((cb) => ns.downloadBuffer(remote(args[0]), cb));
      if (result.res!.statusCode! < 400) {
        process.stdout.write(Buffer.from(result.body.buffer as string, "binary"));
        return 0;
      }
      break;
    case "mkdir":
      result = await call((cb) => ns.mkdir(remote(args[0]), cb));
      break;
    case "rmdir":
      result = await call((cb) => ns.rmdir(remote(args[0]), cb));
      break;
    case "delete":
    case "rm":
      result = await call((cb) => ns.delete(remote(args[0]), cb));
      break;
    case "rename":
      result = await call((cb) => ns.rename(remote(args[0]), remote(args[1], "destination"), cb));
      break;
    case "symlink":
      result = await call((cb) => ns.symlink(remote(args[0], "target"), remote(args[1], "link path"), cb));
      break;
    case "mtime": {
      const mtime = Number(args[1]);
      if (!Number.isInteger(mtime)) throw new UsageError("mtime: <unix-time> must be whole seconds");
      result = await call((cb) => ns.mtime(remote(args[0]), mtime, cb));
      break;
    }
    case "quick-delete":
      if (!options.yes) throw new UsageError("quick-delete removes the directory and everything in it; add --yes to confirm");
      result = await call((cb) => ns.quickDelete(remote(args[0]), cb));
      break;
    default:
      throw new UsageError(`Unknown command "${command}"`);
  }

  const status = result.res?.statusCode ?? 0;
  if (status >= 400) {
    // Download responses carry the error page in `buffer`; other actions in `message`.
    const text = typeof result.body?.buffer === "string" ? result.body.buffer.trim() : result.body?.message;
    const detail = typeof text === "string" && text ? `: ${text.slice(0, 500)}` : "";
    process.stderr.write(`HTTP ${status}${detail}\n`);
    return 1;
  }
  if (options.json) process.stdout.write(`${JSON.stringify(result.body, null, 2)}\n`);
  else {
    const text = print(result.body) || result.body?.message || "OK";
    process.stdout.write(`${text}\n`);
  }
  return 0;
}

if (require.main === module) {
  run(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (err) => {
      process.stderr.write(`${err instanceof UsageError ? "" : "Error: "}${err.message}\n`);
      process.exitCode = err instanceof UsageError ? 2 : 1;
    }
  );
}
