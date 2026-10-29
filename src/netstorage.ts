/// <reference types="node" preserve="true" />
import fs from "fs";
import http from "http";
import path from "path";
import APIRequest from "./api-request";
import { AkamaiConfig } from "./types/akamai-config.types";
import { APIRequestArgs } from "./types/api-request-args.types";
import {
  DeleteResponse,
  DirResponse,
  DownloadBufferResponse,
  DownloadResponse,
  DuResponse,
  ListResponse,
  MkdirResponse,
  MtimeResponse,
  QuickDeleteResponse,
  RenameResponse,
  RmdirResponse,
  StatResponse,
  SymlinkResponse,
  UploadResponse,
} from "./types/responses";

/** Options for {@link Netstorage.list}. Values are sent as query parameters of the `list` action. */
export type ListOpts = {
  /** Maximum number of entries to return. */
  max_entries?: string;
  /** Stop listing at this path. */
  end?: string;
  encoding?: string;
  mtime_all?: string;
};

/** Options for {@link Netstorage.dir}. Values are sent as query parameters of the `dir` action. */
export type DirOpts = {
  /** Only return entries whose name starts with this prefix. */
  prefix?: string;
  /** Maximum number of entries to return. */
  max_entries?: string;
  /** Start listing from this path. */
  start?: string;
  /** Stop listing at this path. */
  end?: string;
  encoding?: string;
  /** Pass `"both"` to return directory names with and without a trailing slash. */
  slash?: "both";
};

/** Object form accepted by {@link Netstorage.dir} and {@link Netstorage.list}. */
export type DirListOpts = {
  /** NetStorage path, e.g. `/123456/images`. */
  path: string;
  /** Extra action parameters. Must contain at least one key. */
  actions: ListOpts | DirOpts;
};

/**
 * Client for the Akamai NetStorage HTTP API.
 *
 * Every operation comes in two forms: a callback method (`stat`, `upload`, ...) that receives
 * `(err, response, body)`, and a promise method with an `Async` suffix (`statAsync`, `uploadAsync`, ...)
 * that resolves with the parsed body.
 *
 * @example
 * ```ts
 * import Netstorage from "ts-netstorageapi-akamai";
 *
 * const ns = new Netstorage({
 *   hostname: "example-nsu.akamaihd.net",
 *   keyName: "upload-user",
 *   key: process.env.NETSTORAGE_KEY!,
 *   cpCode: "123456",
 *   ssl: true,
 * });
 *
 * const { stat } = await ns.statAsync("/123456/hello.txt");
 * ```
 */
class Netstorage {
  /**
   * Low-level request helper used by every method.
   * Public only for compatibility with 1.0.x; prefer the methods below.
   * @hidden
   */
  requestor: APIRequest;

  /**
   * @param netstorageOpts Connection settings. `hostname`, `keyName` and `key` are required;
   * `ssl` defaults to `false`; `proxy` is an optional `http(s)://` proxy URL.
   * @throws Error if `hostname`, `keyName` or `key` is missing, TypeError if `ssl` is not a boolean.
   */
  constructor(netstorageOpts: AkamaiConfig) {
    if (!(netstorageOpts.hostname && netstorageOpts.keyName && netstorageOpts.key)) {
      throw new Error("[Netstorage Error] You should input netstorage hostname, keyname and key all");
    }
    if (netstorageOpts.ssl === undefined) {
      netstorageOpts.ssl = false;
    } else if (typeof netstorageOpts.ssl !== "boolean") {
      throw new TypeError('[Netstorage Error] "ssl" argument should be boolean type');
    }

    this.requestor = new APIRequest(netstorageOpts);
  }

  /**
   * Lists a directory (`dir` action).
   * @param opts Directory path, or `{ path, actions }` with {@link DirOpts}.
   * @param callback Receives the error, the HTTP response and the parsed body.
   * @example
   * ```ts
   * ns.dir({ path: "/123456/images", actions: { max_entries: "100" } }, (err, res, body) => {
   *   if (!err && res.statusCode === 200) console.log(body.stat.file);
   * });
   * ```
   */
  dir(opts: DirListOpts | string, callback: (err: any, res?: http.IncomingMessage, body?: DirResponse) => void): void {
    try {
      return this.requestor.makeRequest(this.buildRequestOptions("dir", opts), callback);
    } catch (err) {
      return callback(err);
    }
  }

  /**
   * Lists a directory (`dir` action).
   * @param opts Directory path, or `{ path, actions }` with {@link DirOpts}.
   * @returns The parsed listing: `body.stat.attribs.directory` and `body.stat.file[]`.
   * @example
   * ```ts
   * const { stat } = await ns.dirAsync("/123456/images");
   * stat.file.forEach((f) => console.log(f.type, f.name, f.size));
   * ```
   */
  dirAsync = async (opts: DirListOpts | string): Promise<DirResponse> => {
    return this.requestor.makeAsyncRequest(this.buildRequestOptions("dir", opts));
  };

  /**
   * Lists files recursively under a path (`list` action).
   * @param opts Path, or `{ path, actions }` with {@link ListOpts}.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  list = (opts: DirListOpts | string, callback: (err: any, res?: http.IncomingMessage, body?: ListResponse) => void): void => {
    try {
      return this.requestor.makeRequest(this.buildRequestOptions("list", opts), callback);
    } catch (err) {
      return callback(err);
    }
  };

  /**
   * Lists files recursively under a path (`list` action).
   * @param opts Path, or `{ path, actions }` with {@link ListOpts}.
   * @returns `body.list.file[]`, plus `body.list.resume[0].start` when more entries remain.
   */
  listAsync = async (opts: DirListOpts | string): Promise<ListResponse> => {
    return this.requestor.makeAsyncRequest(this.buildRequestOptions("list", opts));
  };

  /**
   * Downloads a file to the local disk.
   * @param ns_path NetStorage file path (not a directory).
   * @param local_destination Local file or directory. Pass `""` (or omit it in JavaScript) to use the
   * NetStorage file name in the current directory; a directory keeps the NetStorage file name.
   * @param callback Receives the error, the HTTP response and `{ message: "Download Done." }`.
   * Check `res.statusCode`: the response body is written to disk whatever the status.
   */
  download = (
    ns_path: string,
    local_destination: string,
    callback: (err: any, res?: http.IncomingMessage, body?: DownloadResponse) => void
  ): void => {
    if (typeof local_destination === "function" && callback === undefined) {
      callback = local_destination;
      local_destination = "";
    }
    if (ns_path.endsWith("/")) {
      return callback(new Error("[Netstorage Error] cannot download a directory"), null, null);
    }
    return this.requestor.makeRequest(
      {
        action: "download",
        method: "GET",
        path: ns_path,
        destination: local_destination,
      },
      callback
    );
  };

  /**
   * Downloads a file to the local disk.
   * @param ns_path NetStorage file path (not a directory).
   * @param local_destination Local file or directory. Pass `""` to use the NetStorage file name in the
   * current directory; a directory keeps the NetStorage file name.
   * @returns `{ message: "Download Done." }`. The response body is written whatever the HTTP status;
   * use {@link Netstorage.download} if you need the status code.
   */
  downloadAsync = async (ns_path: string, local_destination: string): Promise<DownloadResponse> => {
    if (ns_path.endsWith("/")) {
      return Promise.reject(new Error("[Netstorage Error] cannot download a directory"));
    }
    return this.requestor.makeAsyncRequest({
      action: "download",
      method: "GET",
      path: ns_path,
      destination: local_destination,
    });
  };

  /**
   * Downloads a file into memory.
   * @param ns_path NetStorage file path (not a directory).
   * @param callback Receives the error, the HTTP response and `{ buffer, message }`.
   * At runtime `body.buffer` holds the bytes as a binary (latin1) string; convert it with
   * `Buffer.from(body.buffer as unknown as string, "binary")` for a real `Buffer`.
   */
  downloadBuffer = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: DownloadBufferResponse) => void): void => {
    if (ns_path.endsWith("/")) {
      return callback(new Error("[Netstorage Error] cannot download a directory"), null, null);
    }
    return this.requestor.makeRequest(
      {
        action: "download",
        method: "GET",
        path: ns_path,
        destination: "",
        buffer: true,
      },
      callback
    );
  };

  /**
   * Downloads a file into memory.
   * @param ns_path NetStorage file path (not a directory).
   * @returns `{ buffer, message }`. At runtime `buffer` holds the bytes as a binary (latin1) string;
   * convert it with `Buffer.from(result.buffer as unknown as string, "binary")` for a real `Buffer`.
   */
  downloadBufferAsync = async (ns_path: string): Promise<DownloadBufferResponse> => {
    if (ns_path.endsWith("/")) {
      return Promise.reject(new Error("[Netstorage Error] cannot download a directory"));
    }
    return this.requestor.makeAsyncRequest({
      action: "download",
      method: "GET",
      path: ns_path,
      destination: "",
      buffer: true,
    });
  };

  /**
   * Disk usage of a directory (`du` action).
   * @param ns_path NetStorage directory path.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  du = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: DuResponse) => void): void => {
    return this.requestor.makeRequest(
      {
        action: "du&format=xml",
        method: "GET",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Disk usage of a directory (`du` action).
   * @param ns_path NetStorage directory path.
   * @returns `body.du["du-info"][0]` with `files` and `bytes` (as strings).
   */
  duAsync = async (ns_path: string): Promise<DuResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "du&format=xml",
      method: "GET",
      path: ns_path,
    });
  };

  /**
   * File or directory metadata (`stat` action).
   * @param ns_path NetStorage path.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  stat = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: StatResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: "stat&format=xml",
        method: "GET",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * File or directory metadata (`stat` action).
   * @param ns_path NetStorage path.
   * @returns `body.stat.file[0]` with `type`, `name`, `mtime` (and `size`, `md5` for files).
   */
  statAsync = async (ns_path: string): Promise<StatResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "stat&format=xml",
      method: "GET",
      path: ns_path,
    });
  };

  /**
   * Creates a directory (`mkdir` action).
   * @param ns_path Full path of the directory to create.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  mkdir = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: MkdirResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: "mkdir",
        method: "POST",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Creates a directory (`mkdir` action).
   * @param ns_path Full path of the directory to create.
   */
  mkdirAsync = async (ns_path: string): Promise<MkdirResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "mkdir",
      method: "POST",
      path: ns_path,
    });
  };

  /**
   * Removes an empty directory (`rmdir` action).
   * @param ns_path Full path of the directory.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  rmdir = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: RmdirResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: "rmdir",
        method: "POST",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Removes an empty directory (`rmdir` action).
   * @param ns_path Full path of the directory.
   */
  rmdirAsync = async (ns_path: string): Promise<RmdirResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "rmdir",
      method: "POST",
      path: ns_path,
    });
  };

  /**
   * Sets the modification time of a file (`mtime` action).
   * @param ns_path NetStorage file path.
   * @param mtime Unix time in seconds (no milliseconds).
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  mtime = (ns_path: string, mtime: number, callback: (err: any, res?: http.IncomingMessage, body?: MtimeResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: `mtime&format=xml&mtime=${mtime}`,
        method: "POST",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Sets the modification time of a file (`mtime` action).
   * @param ns_path NetStorage file path.
   * @param mtime Unix time in seconds (no milliseconds).
   */
  mtimeAsync = async (ns_path: string, mtime: number): Promise<MtimeResponse> => {
    return this.requestor.makeAsyncRequest({
      action: `mtime&format=xml&mtime=${mtime}`,
      method: "POST",
      path: ns_path,
    });
  };

  /**
   * Deletes a file or symlink (`delete` action).
   * @param ns_path Full path of the file.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  delete = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: DeleteResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: "delete",
        method: "POST",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Deletes a file or symlink (`delete` action).
   * @param ns_path Full path of the file.
   */
  deleteAsync = async (ns_path: string): Promise<DeleteResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "delete",
      method: "POST",
      path: ns_path,
    });
  };

  /**
   * Deletes a directory and everything in it (`quick-delete` action).
   * Quick delete must be enabled on the CP code by Akamai.
   * @param ns_path Full path of the directory.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  quickDelete = (ns_path: string, callback: (err: any, res?: http.IncomingMessage, body?: QuickDeleteResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: "quick-delete&quick-delete=imreallyreallysure",
        method: "POST",
        path: ns_path,
      },
      callback
    );
  };

  /**
   * Deletes a directory and everything in it (`quick-delete` action).
   * Quick delete must be enabled on the CP code by Akamai.
   * @param ns_path Full path of the directory.
   */
  quickDeleteAsync = async (ns_path: string): Promise<QuickDeleteResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "quick-delete&quick-delete=imreallyreallysure",
      method: "POST",
      path: ns_path,
    });
  };

  /**
   * Renames or moves a file (`rename` action).
   * @param ns_target Current path.
   * @param ns_destination New path.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  rename = (ns_target: string, ns_destination: string, callback: (err: any, res?: http.IncomingMessage, body?: RenameResponse) => void) => {
    return this.requestor.makeRequest(
      {
        action: `rename&destination=${encodeURIComponent(ns_destination)}`,
        method: "POST",
        path: ns_target,
      },
      callback
    );
  };

  /**
   * Renames or moves a file (`rename` action).
   * @param ns_target Current path.
   * @param ns_destination New path.
   */
  renameAsync = async (ns_target: string, ns_destination: string): Promise<RenameResponse> => {
    return this.requestor.makeAsyncRequest({
      action: `rename&destination=${encodeURIComponent(ns_destination)}`,
      method: "POST",
      path: ns_target,
    });
  };

  /**
   * Creates a symbolic link (`symlink` action).
   * @param ns_target Existing file the link points to.
   * @param ns_destination Path of the new link.
   * @param callback Receives the error, the HTTP response and the parsed body.
   */
  symlink = (ns_target: string, ns_destination: string, callback: (err: any, res?: http.IncomingMessage, body?: SymlinkResponse) => void) => {
    let requestConfig: APIRequestArgs<string> = {
      action: `symlink&target=${encodeURIComponent(ns_target)}`,
      method: "POST",
      path: ns_destination,
    };
    return this.requestor.makeRequest(requestConfig, callback);
  };

  /**
   * Creates a symbolic link (`symlink` action).
   * @param ns_target Existing file the link points to.
   * @param ns_destination Path of the new link.
   */
  symlinkAsync = async (ns_target: string, ns_destination: string): Promise<SymlinkResponse> => {
    let requestConfig: APIRequestArgs<string> = {
      action: `symlink&target=${encodeURIComponent(ns_target)}`,
      method: "POST",
      path: ns_destination,
    };
    return this.requestor.makeAsyncRequest(requestConfig);
  };

  /**
   * Uploads a local file (`upload` action).
   * @param local_source Path of the local file.
   * @param ns_destination NetStorage file path, or a directory ending in `/` to keep the local file name.
   * @param callback Receives the error, the HTTP response and `{ message: "Request Processed." }` on success.
   */
  upload = (local_source: string, ns_destination: string, callback: (err: any, res?: http.IncomingMessage, body?: UploadResponse) => void) => {
    if (local_source.endsWith("/")) {
      return callback(new Error("[Netstorage Error] source must be a valid file"), null, null);
    }
    try {
      if (fs.statSync(local_source).isFile()) {
        if (ns_destination.endsWith("/")) {
          ns_destination = `${ns_destination}${path.basename(local_source)}`;
        }
      } else {
        callback(new Error("[Netstorage Error] You should upload a file"), null, null);
        return;
      }
    } catch (e) {
      callback(e, null, null);
      return;
    }

    return this.requestor.makeRequest(
      {
        action: "upload",
        method: "PUT",
        source: local_source,
        path: ns_destination,
      },
      callback
    );
  };

  /**
   * Uploads a local file (`upload` action).
   * @param local_source Path of the local file.
   * @param ns_destination NetStorage file path, or a directory ending in `/` to keep the local file name.
   * @returns `{ message: "Request Processed." }` on success.
   * @example
   * ```ts
   * await ns.uploadAsync("./build/app.js", "/123456/static/");
   * ```
   */
  uploadAsync = async (local_source: string, ns_destination: string): Promise<UploadResponse> => {
    if (local_source.endsWith("/")) {
      return Promise.reject(new Error("[Netstorage Error] source must be a valid file"));
    }
    try {
      if (fs.statSync(local_source).isFile()) {
        if (ns_destination.endsWith("/")) {
          ns_destination = `${ns_destination}${path.basename(local_source)}`;
        }
      } else {
        return Promise.reject(new Error("[Netstorage Error] You should upload a file"));
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return this.requestor.makeAsyncRequest({
      action: "upload",
      method: "PUT",
      source: local_source,
      path: ns_destination,
    });
  };

  /**
   * Uploads a `Buffer` (`upload` action), e.g. a generated file that never touches the disk.
   * @param local_source File contents.
   * @param basename File name used when `ns_destination` ends in `/`.
   * @param ns_destination NetStorage file path, or a directory ending in `/`.
   * @param callback Receives the error, the HTTP response and `{ message: "Request Processed." }` on success.
   */
  uploadBuffer = (
    local_source: Buffer,
    basename: string,
    ns_destination: string,
    callback: (err: any, res?: http.IncomingMessage, body?: UploadResponse) => void
  ) => {
    try {
      if (ns_destination.endsWith("/")) {
        ns_destination = `${ns_destination}${basename}`;
      }
    } catch (e) {
      callback(e, null, null);
      return;
    }

    return this.requestor.makeRequest(
      {
        action: "upload",
        method: "PUT",
        source: local_source,
        path: ns_destination,
        buffer: true,
      },
      callback
    );
  };

  /**
   * Uploads a `Buffer` (`upload` action), e.g. a generated file that never touches the disk.
   * @param local_source File contents.
   * @param basename File name used when `ns_destination` ends in `/`.
   * @param ns_destination NetStorage file path, or a directory ending in `/`.
   * @returns `{ message: "Request Processed." }` on success.
   * @example
   * ```ts
   * await ns.uploadBufferAsync(Buffer.from(JSON.stringify(data)), "data.json", "/123456/api/");
   * ```
   */
  uploadBufferAsync = async (local_source: Buffer, basename: string, ns_destination: string): Promise<UploadResponse> => {
    try {
      if (ns_destination.endsWith("/")) {
        ns_destination = `${ns_destination}${basename}`;
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return this.requestor.makeAsyncRequest({
      action: "upload",
      method: "PUT",
      source: local_source,
      path: ns_destination,
      buffer: true,
    });
  };

  private buildRequestOptions(method: string, opts: any): APIRequestArgs<string> {
    if (typeof opts === "object") {
      if (opts.path) {
        if (opts.actions instanceof Object && Object.keys(opts.actions).length > 0) {
          return {
            action: `${method}&format=xml${this.buildRequestActions(opts.actions)}`,
            method: "GET",
            path: opts.path,
          };
        } else {
          throw new Error(
            '[Netstorage Error] If an options object is passed, it must contain an "actions" object with key/value pairs for each action option'
          );
        }
      } else {
        throw new Error('[Netstorage Error] If an options object is passed, it must contain a "path" key/value pair');
      }
    } else if (typeof opts === "string") {
      return {
        action: `${method}&format=xml`,
        method: "GET",
        path: opts,
      };
    } else {
      throw new Error("[Netstorage Error] Options must be either a string path, or an object containing all desired options");
    }
  }

  private buildRequestActions(actions: Object): string {
    let parsedActions = "";
    Object.keys(actions).forEach((action) => {
      if (actions[action]) parsedActions += `&${action}=${actions[action]}`;
    });
    return parsedActions;
  }
}

export { AkamaiConfig } from "./types/akamai-config.types";
export {
  DeleteResponse,
  DirResponse,
  DirResponseAttribs,
  DirResponseFile,
  DirResponseStat,
  DownloadBufferResponse,
  DownloadResponse,
  DuResponse,
  DuResponseAttribs,
  DuResponseDu,
  DuResponseDuInfo,
  ListResponse,
  ListResponseFile,
  ListResponseList,
  ListResponseResume,
  MkdirResponse,
  MtimeResponse,
  QuickDeleteResponse,
  RenameResponse,
  RmdirResponse,
  StatResponse,
  StatResponseAttribs,
  StatResponseFile,
  StatResponseStat,
  SymlinkResponse,
  UploadResponse,
} from "./types/responses";
export default Netstorage;
