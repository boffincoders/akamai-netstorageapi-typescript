// Preloaded into CLI child processes by cli.test.ts: sends requests for the test
// hostname to the mock server's port, since NetStorage hostnames carry no port.
const http = require("http");
const original = http.request;
http.request = function (options, callback) {
  if (typeof options === "object" && !options.agent && options.host === process.env.MOCK_HOST) {
    options = { ...options, host: "127.0.0.1", port: Number(process.env.MOCK_PORT) };
  }
  return original.call(http, options, callback);
};
