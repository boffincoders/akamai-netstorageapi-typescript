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

type ListOpts = {
  max_entries?: string;
  end?: string;
  encoding?: string;
  mtime_all?: string;
};
type DirOpts = {
  prefix?: string;
  max_entries?: string;
  start?: string;
  end?: string;
  encoding?: string;
  slash?: "both";
};
type DirListOpts = {
  path: string;
  actions: ListOpts | DirOpts;
};

class Netstorage {
  requestor: APIRequest;
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
  dir(opts: DirListOpts | string, callback: (err: any, res?: http.IncomingMessage, body?: DirResponse) => void): void {
    try {
      return this.requestor.makeRequest(this.buildRequestOptions("dir", opts), callback);
    } catch (err) {
      return callback(err);
    }
  }

  dirAsync = async (opts: DirListOpts | string): Promise<DirResponse> => {
    return this.requestor.makeAsyncRequest(this.buildRequestOptions("dir", opts));
  };

  list = (opts: DirListOpts | string, callback: (err: any, res?: http.IncomingMessage, body?: ListResponse) => void): void => {
    try {
      return this.requestor.makeRequest(this.buildRequestOptions("list", opts), callback);
    } catch (err) {
      return callback(err);
    }
  };

  listAsync = async (opts: DirListOpts | string): Promise<ListResponse> => {
    return this.requestor.makeAsyncRequest(this.buildRequestOptions("list", opts));
  };

  download = (
    ns_path: string,
    local_destination: string,
    callback: (err: any, res?: http.IncomingMessage, body?: DownloadResponse) => void
  ): void => {
    if (ns_path.endsWith("/")) {
      return callback(new Error("[Netstorage Error] cannot download a directory"), null, null);
    }
    if (typeof local_destination === "function" && callback === undefined) {
      callback = local_destination;
      local_destination = "";
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

  duAsync = async (ns_path: string): Promise<DuResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "du&format=xml",
      method: "GET",
      path: ns_path,
    });
  };

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

  statAsync = async (ns_path: string): Promise<StatResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "stat&format=xml",
      method: "GET",
      path: ns_path,
    });
  };

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

  mkdirAsync = async (ns_path: string): Promise<MkdirResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "mkdir",
      method: "POST",
      path: ns_path,
    });
  };

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

  rmdirAsync = async (ns_path: string): Promise<RmdirResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "rmdir",
      method: "POST",
      path: ns_path,
    });
  };

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

  mtimeAsync = async (ns_path: string, mtime: number): Promise<MtimeResponse> => {
    return this.requestor.makeAsyncRequest({
      action: `mtime&format=xml&mtime=${mtime}`,
      method: "POST",
      path: ns_path,
    });
  };

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

  deleteAsync = async (ns_path: string): Promise<DeleteResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "delete",
      method: "POST",
      path: ns_path,
    });
  };

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

  quickDeleteAsync = async (ns_path: string): Promise<QuickDeleteResponse> => {
    return this.requestor.makeAsyncRequest({
      action: "quick-delete&quick-delete=imreallyreallysure",
      method: "POST",
      path: ns_path,
    });
  };

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

  renameAsync = async (ns_target: string, ns_destination: string): Promise<RenameResponse> => {
    return this.requestor.makeAsyncRequest({
      action: `rename&destination=${encodeURIComponent(ns_destination)}`,
      method: "POST",
      path: ns_target,
    });
  };

  symlink = (ns_target: string, ns_destination: string, callback: (err: any, res?: http.IncomingMessage, body?: SymlinkResponse) => void) => {
    let requestConfig: APIRequestArgs<string> = {
      action: `symlink&target=${encodeURIComponent(ns_target)}`,
      method: "POST",
      path: ns_destination,
    };
    return this.requestor.makeRequest(requestConfig, callback);
  };

  symlinkAsync = async (ns_target: string, ns_destination: string): Promise<SymlinkResponse> => {
    let requestConfig: APIRequestArgs<string> = {
      action: `symlink&target=${encodeURIComponent(ns_target)}`,
      method: "POST",
      path: ns_destination,
    };
    return this.requestor.makeAsyncRequest(requestConfig);
  };

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
export default Netstorage;
