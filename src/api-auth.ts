"use strict";

import { AkamaiConfig } from "./types/akamai-config.types";

const crypto = require("crypto");
type AuthOpts = Pick<AkamaiConfig, "key" | "keyName">;

type AuthConfig = {
  acs_auth_data: string;
  acs_auth_sign: string;
};
class Auth {
  opts: AuthOpts;
  constructor(opts: AuthOpts) {
    if (!(opts.key && opts.keyName)) {
      throw new Error("[Auth Error] options object should contain key and keyName attributes");
    }
    this.opts = opts;
  }

  auth(netstoragePath: string, actionHeaders: string): AuthConfig {
    let acs_auth_data = "";
    let acs_auth_sign = "";

    try {
      acs_auth_data = `5, 0.0.0.0, 0.0.0.0, ${Math.floor(Date.now() / 1000)}, ${Math.floor(Math.random() * 100000)}, ${this.opts.keyName}`;
      const sign_string = `${netstoragePath}\nx-akamai-acs-action:${actionHeaders}\n`;
      const message = acs_auth_data + sign_string;
      acs_auth_sign = crypto.createHmac("sha256", this.opts.key).update(message).digest("base64");
    } catch (err) {
      throw new Error(`[Auth Error] ${err}`);
    }

    return { acs_auth_data: acs_auth_data, acs_auth_sign: acs_auth_sign };
  }
}
export default Auth;
