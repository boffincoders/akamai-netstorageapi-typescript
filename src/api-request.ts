import fs from "fs";
import http, { ClientRequest } from "http";
import https, { RequestOptions } from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import path from "path";
import Auth from "./api-auth";
import Parser from "./api-request-parser";
import { AkamaiConfig } from "./types/akamai-config.types";
import { APIRequestArgs } from "./types/api-request-args.types";

class Requestor {
  auth: Auth;
  agent: HttpsProxyAgent.HttpsProxyAgent;
  parser: Parser;
  requestorOptions: AkamaiConfig;
  constructor(requestorOptions: AkamaiConfig) {
    if (!(requestorOptions.hostname && requestorOptions.keyName && requestorOptions.key && requestorOptions.ssl != undefined)) {
      throw new Error("[Requestor Error] options object should contain key, keyName, hostname, and ssl attributes");
    }

    this.auth = new Auth({
      key: requestorOptions.key,
      keyName: requestorOptions.keyName,
    });
    this.parser = new Parser();
    if (requestorOptions.proxy) {
      // Loaded only when a proxy is configured, so other users never pay its load time.
      const proxyAgent: typeof HttpsProxyAgent = require("https-proxy-agent");
      this.agent = new proxyAgent.HttpsProxyAgent(requestorOptions.proxy.toString());
    }
    this.requestorOptions = requestorOptions;
  }

  makeRequest = <T extends any, U extends any>(requestArgs: APIRequestArgs<string>, callback: (err: any, res?: T, body?: U) => void) => {
    const acs_action = `version=1&action=${requestArgs.action}`;
    const netstoragePath = this.validatePath(requestArgs.path);
    const authData = this.auth.auth(netstoragePath, acs_action);

    let options: RequestOptions = {
      method: requestArgs.method,
      host: this.requestorOptions.hostname,
      path: netstoragePath,
      headers: {
        "X-Akamai-ACS-Action": acs_action,
        "X-Akamai-ACS-Auth-Data": authData.acs_auth_data,
        "X-Akamai-ACS-Auth-Sign": authData.acs_auth_sign,
        "Accept-Encoding": "identity",
        "User-Agent": "NetStorageKit-Node",
      },
      ...(this.agent && { agent: this.agent as unknown as http.Agent }),
    };

    let request = (this.requestorOptions.ssl ? https : http).request(options, (res) => {
      this.onIncompleteResponse(res, (err) => callback(err, null, null));
      let rawData = "";
      res.setEncoding("binary");
      res
        .on("data", (data) => {
          rawData += data;
        })
        .on("end", () => {
          if (requestArgs.action == "download") {
            let local_destination = requestArgs.destination;
            if (requestArgs.path.endsWith("/")) {
              callback(new Error("[Netstorage Error] Nestorage Path should be a file, not directory"), null, null);
              return;
            } else if (requestArgs.buffer) return callback(null, res as T, { buffer: rawData as T, message: "Download Done." } as U);
            else if (!local_destination) {
              local_destination = path.basename(requestArgs.path);
            } else {
              try {
                if (fs.statSync(local_destination).isDirectory()) {
                  local_destination = path.join(local_destination, path.basename(requestArgs.path));
                }
              } catch (e) {}
            }
            try {
              fs.writeFileSync(local_destination, rawData, "binary");
            } catch (e) {
              callback(e);
              return;
            }
            callback(null, res as T, { message: "Download Done." } as U);
          } else {
            this.parser.parse(rawData, (err, json) => {
              if (requestArgs.action == "upload" && !rawData && res.statusCode == 200) {
                // For Object Store upload response: {}
                callback(null, res as T, { message: "Request Processed." } as U);
              } else {
                callback(null, res as T, json as U);
              }
            });
          }
        });
    });

    request.on("error", (err) => {
      callback(err, null, null);
    });

    if (requestArgs.action == "upload") {
      const uploadError = this.writeUploadBody(request, requestArgs);
      if (uploadError) {
        callback(uploadError, null, null);
        return;
      }
    }
    request.end();
  };

  makeAsyncRequest = async <T extends any>(requestArgs: APIRequestArgs<string>): Promise<T> => {
    const acs_action = `version=1&action=${requestArgs.action}`;
    const netstoragePath = this.validatePath(requestArgs.path);
    const authData = this.auth.auth(netstoragePath, acs_action);

    let options: RequestOptions = {
      method: requestArgs.method,
      host: this.requestorOptions.hostname,
      path: netstoragePath,
      headers: {
        "X-Akamai-ACS-Action": acs_action,
        "X-Akamai-ACS-Auth-Data": authData.acs_auth_data,
        "X-Akamai-ACS-Auth-Sign": authData.acs_auth_sign,
        "Accept-Encoding": "identity",
        "User-Agent": "NetStorageKit-Node",
      },
      ...(this.agent && { agent: this.agent as unknown as http.Agent }),
    };
    let isSSL = this.requestorOptions.ssl;
    return new Promise<T>((resolve, reject) => {
      let request = (isSSL ? https : http).request(options, (res) => {
        this.onIncompleteResponse(res, reject);
        let rawData = "";
        res.setEncoding("binary");
        res
          .on("data", (data) => {
            rawData += data;
          })
          .on("end", () => {
            if (requestArgs.action == "download") {
              let local_destination = requestArgs.destination;
              if (requestArgs.path.endsWith("/")) {
                reject(new Error("[Netstorage Error] Nestorage Path should be a file, not directory"));
                return;
              } else if (requestArgs.buffer) return resolve({ buffer: rawData as T, message: "Download Done." } as T);
              else if (!local_destination) {
                local_destination = path.basename(requestArgs.path);
              } else {
                try {
                  if (fs.statSync(local_destination).isDirectory()) {
                    local_destination = path.join(local_destination, path.basename(requestArgs.path));
                  }
                } catch (e) {}
              }
              try {
                fs.writeFileSync(local_destination, rawData, "binary");
              } catch (e) {
                reject(e);
                return;
              }
              resolve({ message: "Download Done." } as T);
            } else {
              this.parser.parse(rawData, (err, json) => {
                if (requestArgs.action == "upload" && !rawData && res.statusCode == 200) {
                  resolve({ message: "Request Processed." } as T);
                } else {
                  resolve(json as T);
                }
              });
            }
          });
      });

      request.on("error", (err) => {
        reject(err);
      });

      if (requestArgs.action == "upload") {
        const uploadError = this.writeUploadBody(request, requestArgs);
        if (uploadError) {
          reject(uploadError);
          return;
        }
      }
      request.end();
    });
  };

  // A connection that drops mid-response never emits "end", which used to leave the caller
  // waiting forever. Report it once instead. Registered before the other "end" listener,
  // so a completed response is never reported as incomplete.
  private onIncompleteResponse(res: http.IncomingMessage, report: (err: Error) => void) {
    let settled = false;
    res.on("end", () => (settled = true));
    const fail = (err?: Error) => {
      if (settled) return;
      settled = true;
      report(err || Object.assign(new Error("[Netstorage Error] Connection closed before the response was complete"), { code: "ECONNRESET" }));
    };
    res.on("error", (err) => fail(err));
    res.on("close", () => fail());
  }

  // Writes the upload body and returns the error, if any. On failure the request is
  // aborted instead of ended, so it never sends an empty PUT over the destination file.
  private writeUploadBody(request: ClientRequest, requestArgs: APIRequestArgs<string>): any {
    try {
      if (requestArgs.buffer) request.write(requestArgs.source);
      else request.write(fs.readFileSync(requestArgs.source));
      return null;
    } catch (err) {
      request.removeAllListeners("error");
      request.on("error", () => {});
      request.destroy();
      return err;
    }
  }

  validatePath(path): string {
    if (!path.startsWith("/")) {
      return escape(`/${path}`);
    }
    return escape(path);
  }
}
export default Requestor;
