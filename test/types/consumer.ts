// Compiled by interop.test.ts against the built declarations in dist/, as a user project would.
import Netstorage, { AkamaiConfig, DirListOpts, DirResponse, DownloadBufferResponse, UploadResponse } from "ts-netstorageapi-akamai";
import { DuResponse, StatResponse } from "ts-netstorageapi-akamai/dist/types/responses";
import { AkamaiConfig as DeepConfig } from "ts-netstorageapi-akamai/dist/types/akamai-config.types";
import type { IncomingMessage } from "http";

const config: AkamaiConfig = { hostname: "h", keyName: "k", key: "s", cpCode: "1", ssl: true, proxy: "http://proxy:3128" };
const deep: DeepConfig = config;
const ns = new Netstorage(deep);

async function main() {
  const dir: DirResponse = await ns.dirAsync("/1");
  const names: string[] = dir.stat.file.map((f) => f.name);
  const opts: DirListOpts = { path: "/1", actions: { max_entries: "10", slash: "both" } };
  await ns.listAsync(opts);
  const du: DuResponse = await ns.duAsync("/1");
  const bytes: string = du.du["du-info"][0].bytes;
  const stat: StatResponse = await ns.statAsync("/1/a");
  const up: UploadResponse = await ns.uploadBufferAsync(Buffer.from("x"), "a.txt", "/1/");
  const down: DownloadBufferResponse = await ns.downloadBufferAsync("/1/a.txt");
  ns.upload("a.txt", "/1/", (err: any, res?: IncomingMessage, body?: UploadResponse) => {
    if (!err && res?.statusCode === 200) console.log(body?.message);
  });
  ns.requestor.validatePath("/1");
  return [names, bytes, stat, up.message, down.message];
}
void main;
