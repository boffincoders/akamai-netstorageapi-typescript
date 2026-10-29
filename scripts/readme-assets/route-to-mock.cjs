// Preloaded into the CLI by build.mjs: sends http and https requests for the demo
// hostname to the local mock server, so the demo shows real CLI output without
// contacting Akamai.
const http = require("http");
const https = require("https");
const original = http.request;
const route = (options, callback) => {
  if (typeof options === "object" && options.host === process.env.MOCK_HOST) {
    options = { ...options, host: "127.0.0.1", port: Number(process.env.MOCK_PORT) };
  }
  return original.call(http, options, callback);
};
http.request = route;
https.request = route;
