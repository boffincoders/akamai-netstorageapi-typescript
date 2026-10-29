// Playground: builds and signs a NetStorage request exactly as the client does
// (src/api-auth.ts, src/api-request.ts), and parses XML the way the client
// shapes responses (src/api-request-parser.ts). Everything runs in the browser;
// nothing is sent anywhere.
(() => {
  const methods = window.NS_METHODS || [];
  const $ = (id) => document.getElementById(id);
  const enc = new TextEncoder();

  // ---------------------------------------------------------------- signer
  const form = $("signer");
  if (form) {
    const op = $("op");
    methods.forEach((m) => op.add(new Option(`${m.name}  (${m.http})`, m.name)));
    const wanted = new URLSearchParams(location.search).get("op");
    op.value = methods.some((m) => m.name === wanted) ? wanted : "upload";

    const fieldsFor = { destination: $("f-destination"), target: $("f-target"), mtime: $("f-mtime"), dirOptions: $("f-dir"), listOptions: $("f-list") };
    const freshAuth = () => {
      $("time").value = String(Math.floor(Date.now() / 1000));
      $("uid").value = String(Math.floor(Math.random() * 100000));
    };

    const validatePath = (p) => (p.startsWith("/") ? escape(p) : escape(`/${p}`));

    const actionFor = (m) => {
      const pairs = (entries) => entries.filter(([, v]) => v).map(([k, v]) => `&${k}=${v}`).join("");
      switch (m.name) {
        case "dir": return `dir&format=xml${pairs([["max_entries", $("dir-max").value], ["prefix", $("dir-prefix").value], ["start", $("dir-start").value], ["end", $("dir-end").value]])}`;
        case "list": return `list&format=xml${pairs([["max_entries", $("list-max").value], ["end", $("list-end").value]])}`;
        case "rename": return `rename&destination=${encodeURIComponent($("destination").value)}`;
        case "symlink": return `symlink&target=${encodeURIComponent($("target").value)}`;
        case "mtime": return `mtime&format=xml&mtime=${$("mtime").value}`;
        default: return m.action;
      }
    };

    const hmac = async (key, message) => {
      const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
      let bin = "";
      sig.forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin);
    };

    const sh = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

    const update = async () => {
      const m = methods.find((x) => x.name === op.value);
      Object.entries(fieldsFor).forEach(([k, el]) => (el.hidden = !m.inputs.includes(k)));
      $("path-label").firstChild.textContent = m.name === "symlink" ? "Link path " : m.name === "rename" ? "Current path " : "NetStorage path ";

      const host = $("host").value.trim() || "example-nsu.akamaihd.net";
      const keyName = $("keyname").value.trim();
      const key = $("key").value;
      const ssl = $("ssl").checked;
      const nsPath = validatePath($("path").value.trim() || "/");
      const acsAction = `version=1&action=${actionFor(m)}`;
      const authData = `5, 0.0.0.0, 0.0.0.0, ${$("time").value}, ${$("uid").value}, ${keyName}`;
      const signed = `${authData}${nsPath}\nx-akamai-acs-action:${acsAction}\n`;
      let signature = "(enter a key to sign)";
      if (key) {
        try { signature = await hmac(key, signed); } catch { signature = "(this browser cannot sign here; open the page over https)"; }
      }
      const url = `${ssl ? "https" : "http"}://${host}${nsPath}`;

      $("out-request").textContent = [
        `${m.http} ${nsPath} HTTP/1.1`,
        `Host: ${host}`,
        `X-Akamai-ACS-Action: ${acsAction}`,
        `X-Akamai-ACS-Auth-Data: ${authData}`,
        `X-Akamai-ACS-Auth-Sign: ${signature}`,
        "Accept-Encoding: identity",
        "User-Agent: NetStorageKit-Node",
      ].join("\n");
      $("out-signed").textContent = signed.replace(/\n/g, "\\n\n");

      const curl = [`curl -sS ${sh(url)}`];
      if (m.http === "POST") curl.push("-X POST");
      if (m.http === "PUT") curl.push("-T ./local-file");
      if (m.name === "download" || m.name === "downloadBuffer") curl.push(`-o ${sh(nsPath.split("/").pop() || "download")}`);
      curl.push(`-H ${sh(`X-Akamai-ACS-Action: ${acsAction}`)}`, `-H ${sh(`X-Akamai-ACS-Auth-Data: ${authData}`)}`, `-H ${sh(`X-Akamai-ACS-Auth-Sign: ${signature}`)}`);
      $("out-curl").textContent = curl.join(" \\\n  ");

      const p = JSON.stringify($("path").value.trim() || "/");
      const callArgs = {
        upload: `"./local-file", ${p}`,
        uploadBuffer: `buffer, "file-name", ${p}`,
        download: `${p}, "./"`,
        rename: `${p}, ${JSON.stringify($("destination").value)}`,
        symlink: `${JSON.stringify($("target").value)}, ${p}`,
        mtime: `${p}, ${$("mtime").value}`,
      }[m.name];
      const dirOpts = m.name === "dir" || m.name === "list" ? actionFor(m).replace(/^\w+&format=xml/, "") : "";
      const arg = callArgs || (dirOpts
        ? `{ path: ${p}, actions: { ${dirOpts.slice(1).split("&").map((kv) => { const [k, v] = kv.split("="); return `${k}: ${JSON.stringify(v)}`; }).join(", ")} } }`
        : p);
      $("out-ts").textContent = `const ns = new Netstorage({
  hostname: ${JSON.stringify(host)},
  keyName: ${JSON.stringify(keyName)},
  key: process.env.NETSTORAGE_KEY!,
  cpCode: ${JSON.stringify(($("path").value.match(/^\/?(\d+)/) || [])[1] || "")},
  ssl: ${ssl},
});

const result = await ns.${m.name}Async(${arg});`;
      $("out-cli").textContent = m.cli || "(no CLI equivalent)";
    };

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    $("refresh").addEventListener("click", () => { freshAuth(); update(); });
    $("reveal").addEventListener("change", (e) => ($("key").type = e.target.checked ? "text" : "password"));
    freshAuth();
    update();
  }

  // ---------------------------------------------------------- XML explorer
  const xmlIn = $("xml-in");
  if (xmlIn) {
    const samples = window.NS_XML_SAMPLES || {};
    const preset = $("xml-preset");
    Object.keys(samples).forEach((k) => preset.add(new Option(samples[k].label, k)));

    // Same shape as the client: the root keeps its attributes as `attribs`, and
    // each child element name maps to a list of that element's attributes.
    const attrs = (el) => {
      if (!el.attributes.length) return undefined;
      const o = {};
      for (const a of el.attributes) o[a.name] = a.value;
      return o;
    };
    const shape = (text) => {
      if (!text.trim()) return {};
      const doc = new DOMParser().parseFromString(text.trim(), "application/xml");
      if (doc.getElementsByTagName("parsererror").length) return { message: text.trim() };
      const root = doc.documentElement;
      const node = {};
      const a = attrs(root);
      if (a) node.attribs = a;
      for (const child of root.children) (node[child.tagName] ||= []).push(attrs(child));
      return { [root.tagName]: node };
    };
    const run = () => {
      $("xml-out").textContent = JSON.stringify(shape(xmlIn.value), null, 2);
      const s = samples[preset.value];
      $("xml-type").textContent = s && xmlIn.value === s.xml ? s.type : "";
    };
    preset.addEventListener("change", () => { xmlIn.value = samples[preset.value].xml; run(); });
    xmlIn.addEventListener("input", run);
    preset.value = Object.keys(samples)[0];
    xmlIn.value = samples[preset.value].xml;
    run();
  }
})();
