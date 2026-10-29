// Builds the SVG illustrations used in README.md into assets/.
//
//   npm run build && npm run assets
//
// The terminal demo is real output: each command runs the built CLI (dist/cli.js)
// against a local mock NetStorage server, so the picture changes when the CLI does.
// Nothing here contacts Akamai, and assets/ is not part of the npm package.

import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "assets");
const cli = path.join(root, "dist/cli.js");
if (!fs.existsSync(cli)) throw new Error("dist/cli.js is missing. Run `npm run build` first.");

// Boffin Coders brand palette (boffincoders.com): gold on near-black.
const C = {
  bg: "#0d0d0d",
  panel: "#1a1a1a",
  panelHi: "#222222",
  border: "#2a2a2a",
  text: "#ffffff",
  muted: "#a3a3a3",
  gold: "#d4a012",
  blue: "#6ea8fe",
  purple: "#c49bff",
  green: "#4ade80",
};

// Small Boffin Coders logo, embedded so it shows wherever the SVG is displayed.
const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(here, "boffin-mark.png")).toString("base64")}`;
function brand(right, cy, size = 26) {
  return `<g><image href="${LOGO}" x="${right - size}" y="${cy - size / 2}" width="${size}" height="${size}"/>
<text x="${right - size - 8}" y="${cy + 4.5}" text-anchor="end" font-family="${SANS}" font-size="12.5" font-weight="600" fill="${C.muted}">by Boffin Coders</text></g>`;
}
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Keeps runs of spaces in SVG text without relying on xml:space.
const pre = (s) => esc(s).replace(/ /g, " ");
const pct = (t, total) => ((t / total) * 100).toFixed(3);

function svgDoc({ width, height, title, desc, style, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
${style}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .cover, .motion { display: none; } }
</style>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Terminal demo: real CLI output from a mock NetStorage
// ---------------------------------------------------------------------------

const DEMO_HOST = "example-nsu.akamaihd.net";
const T0 = 1793250000; // 2026-10-29T05:00:00Z, fixed so the picture is stable

function mockNetStorage() {
  const dirXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<stat directory="/123456/static">
<file type="dir" name="images" mtime="${T0 - 3600}" bytes="1795089" files="12"/>
<file type="file" name="app.css" mtime="${T0}" size="9120" md5="9e107d9d372bb6826bd81d3542a419d6"/>
<file type="file" name="app.js" mtime="${T0 + 60}" size="48213" md5="e4d909c290d0fb1ca068ffaddf22cbd0"/>
<file type="symlink" name="latest.js" mtime="${T0 + 60}" target="app.js"/>
</stat>
`;
  const duXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<du directory="/123456/static">
<du-info files="14" bytes="1852422"/>
</du>
`;
  return http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const action = String(req.headers["x-akamai-acs-action"]);
      if (action.includes("action=dir")) return res.end(dirXml);
      if (action.includes("action=du")) return res.end(duXml);
      if (action.includes("action=download")) return res.end(Buffer.alloc(48213, 97));
      res.end("");
    });
  });
}

async function captureSession() {
  const server = mockNetStorage();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ns-demo-"));
  fs.mkdirSync(path.join(cwd, "dist"));
  fs.mkdirSync(path.join(cwd, "backup"));
  fs.writeFileSync(path.join(cwd, "dist/app.js"), "console.log('hello');\n");
  const run = promisify(execFile);
  const env = {
    PATH: process.env.PATH,
    NODE_OPTIONS: `--require ${path.join(here, "route-to-mock.cjs")}`,
    MOCK_HOST: DEMO_HOST,
    MOCK_PORT: String(port),
    NETSTORAGE_HOST: DEMO_HOST,
    NETSTORAGE_KEYNAME: "upload-user",
    NETSTORAGE_KEY: "demo-key",
    NETSTORAGE_CPCODE: "123456",
  };
  const commands = [
    "upload dist/app.js static/",
    "ls static",
    "du static",
    "download static/app.js backup/",
  ];
  const session = [];
  try {
    for (const args of commands) {
      const { stdout } = await run(process.execPath, [cli, ...args.split(" ")], { cwd, env });
      session.push({ command: `npx akamai-netstorage ${args}`, output: stdout.replace(/\n$/, "").split("\n") });
    }
  } finally {
    server.close();
    fs.rmSync(cwd, { recursive: true, force: true });
  }
  return session;
}

function terminalSvg(session) {
  const W = 900;
  const lineH = 22;
  const charW = 8.6; // generous monospace width at 14px, used to size the typing cover
  const padX = 24;
  const top = 64;
  const typeSpeed = 0.045;

  const lines = [];
  let t = 0.6;
  lines.push({ kind: "comment", text: "# Credentials come from NETSTORAGE_HOST, NETSTORAGE_KEYNAME and NETSTORAGE_KEY", at: t });
  t += 0.9;
  for (const step of session) {
    const typeTime = step.command.length * typeSpeed;
    lines.push({ kind: "command", text: step.command, at: t, typeEnd: t + 0.3 + typeTime });
    t += 0.3 + typeTime + 0.35;
    for (const out of step.output) lines.push({ kind: "output", text: out, at: t });
    t += 1.3;
  }
  lines.push({ kind: "prompt", text: "", at: t });
  const total = t + 3.5;
  const H = top + lines.length * lineH + 28;

  const css = [
    `.term { font: 14px ${MONO}; }`,
    `@keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`,
    `.cursor { animation: blink 1s step-end infinite; }`,
  ];
  const rows = [];
  lines.forEach((line, i) => {
    const y = top + i * lineH;
    const show = `s${i}`;
    css.push(
      `@keyframes ${show} { 0%, ${pct(line.at, total)}% { opacity: 0; } ${pct(line.at + 0.01, total)}%, ${pct(total - 0.5, total)}% { opacity: 1; } 100% { opacity: 0; } }`,
      `.${show} { animation: ${show} ${total.toFixed(2)}s linear infinite; }`
    );
    let content;
    if (line.kind === "comment") {
      content = `<text x="${padX}" y="${y}" fill="${C.muted}">${pre(line.text)}</text>`;
    } else if (line.kind === "command" || line.kind === "prompt") {
      const textX = padX + 2 * charW;
      content = `<text x="${padX}" y="${y}"><tspan fill="${C.gold}">$</tspan><tspan x="${textX}" fill="${C.text}">${pre(line.text)}</tspan></text>`;
      if (line.kind === "command") {
        const width = Math.ceil(line.text.length * charW) + 12;
        const cover = `c${i}`;
        css.push(
          `@keyframes ${cover} { 0%, ${pct(line.at + 0.3, total)}% { transform: translateX(0px); animation-timing-function: steps(${line.text.length}, end); } ${pct(line.typeEnd, total)}%, 100% { transform: translateX(${width}px); } }`,
          `.${cover} { animation: ${cover} ${total.toFixed(2)}s linear infinite; }`
        );
        content += `<rect class="cover ${cover}" x="${textX - 1}" y="${y - 16}" width="${width}" height="${lineH}" fill="${C.bg}"/>`;
      } else {
        content += `<rect class="cursor" x="${textX}" y="${y - 14}" width="8" height="17" fill="${C.text}"/>`;
      }
    } else {
      const m = line.text.match(/^(dir|file|symlink)(\s.*)$/);
      const typeColor = { dir: C.blue, file: C.text, symlink: C.purple };
      content = m
        ? `<text x="${padX}" y="${y}" fill="${C.muted}"><tspan fill="${typeColor[m[1]]}">${pre(m[1])}</tspan>${pre(m[2])}</text>`
        : `<text x="${padX}" y="${y}" fill="${C.green}">${pre(line.text)}</text>`;
    }
    rows.push(`<g class="${show}">${content}</g>`);
  });

  const body = `<rect width="${W}" height="${H}" rx="12" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${C.border}"/>
<circle cx="24" cy="22" r="6" fill="${C.border}"/><circle cx="44" cy="22" r="6" fill="${C.border}"/><circle cx="64" cy="22" r="6" fill="${C.border}"/>
<text x="${W / 2}" y="27" text-anchor="middle" fill="${C.muted}" font-family="${SANS}" font-size="13">akamai-netstorage · command line</text>
${brand(W - 16, 21, 20)}
<line x1="0" y1="42" x2="${W}" y2="42" stroke="${C.border}"/>
<g class="term">
${rows.join("\n")}
</g>`;

  return svgDoc({
    width: W,
    height: H,
    title: "akamai-netstorage command line demo",
    desc: `A terminal session: ${session.map((s) => s.command).join("; ")}. Each command prints its result, for example ${session[0].output[0]}`,
    style: css.join("\n"),
    body,
  });
}

// ---------------------------------------------------------------------------
// How it works: the life of one call
// ---------------------------------------------------------------------------

function card({ x, y, w, h, n, title, lines, color, cls }) {
  const badge = n
    ? `<circle cx="${x + 20}" cy="${y + 21}" r="10" fill="${color}"/><text x="${x + 20}" y="${y + 25}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" fill="${C.bg}">${n}</text>`
    : "";
  const titleX = n ? x + 38 : x + 14;
  const body = lines
    .map((l, i) => `<text x="${x + 14}" y="${y + 58 + i * 18}" font-family="${MONO}" font-size="11" fill="${l.color || C.text}">${pre(l.text ?? l)}</text>`)
    .join("");
  return `<g>
<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
${badge}<text x="${titleX}" y="${y + 26}" font-family="${SANS}" font-size="13.5" font-weight="600" fill="${C.text}">${esc(title)}</text>
<line x1="${x + 12}" y1="${y + 38}" x2="${x + w - 12}" y2="${y + 38}" stroke="${C.border}"/>
${body}
</g>`;
}

function howItWorksSvg() {
  const W = 1000;
  const H = 500;
  const cw = 176;
  const gap = 22;
  const x0 = 16;
  const cx = (i) => x0 + i * (cw + gap);
  const y1 = 84;
  const h1 = 150;
  const y2 = 300;
  const h2 = 132;
  const loop = 10;

  // When each card and arrow lights up, in seconds of a 10 s loop.
  const windows = {
    "k-app": [[0.0, 1.4], [8.8, 9.75]],
    "a-1": [[1.0, 1.8]],
    "k-build": [[1.4, 3.0]],
    "a-2": [[2.6, 3.4]],
    "k-sign": [[3.0, 4.6]],
    "a-3": [[4.2, 5.0]],
    "k-send": [[4.6, 6.0]],
    "a-4": [[5.6, 6.4]],
    "k-ns": [[6.0, 7.2]],
    "a-5": [[6.8, 7.6]],
    "k-parse": [[7.2, 8.8]],
    "a-6": [[8.4, 9.2]],
  };
  const css = [];
  for (const [cls, spans] of Object.entries(windows)) {
    const on = cls === "k-ns" ? C.blue : C.gold;
    const frames = [`0% { stroke: ${C.border}; }`];
    for (const [from, to] of spans) {
      frames.push(
        `${pct(from, loop)}% { stroke: ${C.border}; }`,
        `${pct(from + 0.15, loop)}%, ${pct(to, loop)}% { stroke: ${on}; }`,
        `${pct(Math.min(to + 0.25, loop), loop)}% { stroke: ${C.border}; }`
      );
    }
    frames.push(`100% { stroke: ${C.border}; }`);
    css.push(`@keyframes ${cls} { ${frames.join(" ")} }`, `.${cls} { animation: ${cls} ${loop}s ease-in-out infinite; }`);
  }

  const arrow = (cls, d) => `<path class="${cls}" d="${d}" fill="none" stroke="${C.border}" stroke-width="2" marker-end="url(#head)"/>`;
  const mid = y1 + h1 / 2;
  const arrows = [
    arrow("a-1", `M ${cx(0) + cw + 3} ${mid} H ${cx(1) - 5}`),
    arrow("a-2", `M ${cx(1) + cw + 3} ${mid} H ${cx(2) - 5}`),
    arrow("a-3", `M ${cx(2) + cw + 3} ${mid} H ${cx(3) - 5}`),
    arrow("a-4", `M ${cx(3) + cw + 3} ${mid} H ${cx(4) - 5}`),
    arrow("a-5", `M ${cx(4) + cw / 2} ${y1 + h1 + 3} V ${y2 + h2 / 2} H ${cx(3) + cw + 5}`),
    arrow("a-6", `M ${cx(1) - 3} ${y2 + h2 / 2} H ${cx(0) + cw / 2} V ${y1 + h1 + 7}`),
  ];

  const cards = [
    card({ x: cx(0), y: y1, w: cw, h: h1, title: "Your code", color: C.blue, cls: "k-app", lines: [
      { text: "await ns.statAsync(", color: C.blue },
      { text: '  "/123456/app.js"', color: C.gold },
      { text: ")", color: C.blue },
      { text: "or the callback form", color: C.muted },
    ] }),
    card({ x: cx(1), y: y1, w: cw, h: h1, n: 1, title: "Build the request", color: C.gold, cls: "k-build", lines: [
      "GET /123456/app.js",
      { text: "X-Akamai-ACS-Action:", color: C.muted },
      "version=1&action=stat",
      "&format=xml",
    ] }),
    card({ x: cx(2), y: y1, w: cw, h: h1, n: 2, title: "Sign it", color: C.gold, cls: "k-sign", lines: [
      { text: "X-Akamai-ACS-Auth-Data", color: C.muted },
      "5, <time>, <id>, <key>",
      { text: "X-Akamai-ACS-Auth-Sign", color: C.muted },
      "HMAC-SHA256, base64",
    ] }),
    card({ x: cx(3), y: y1, w: cw, h: h1, n: 3, title: "Send it", color: C.gold, cls: "k-send", lines: [
      "https when ssl: true,",
      "otherwise http",
      { text: "through your proxy", color: C.muted },
      { text: "when proxy is set", color: C.muted },
    ] }),
    card({ x: cx(4), y: y1, w: cw, h: h1, title: "Akamai NetStorage", color: C.blue, cls: "k-ns", lines: [
      { text: "200 OK", color: C.green },
      '<stat directory=',
      '  "/123456">',
      '<file name="app.js" …/>',
    ] }),
    card({ x: cx(1), y: y2, w: cw * 3 + gap * 2, h: h2, n: 4, title: "Parse the XML into a typed object", color: C.gold, cls: "k-parse", lines: [
      { text: "StatResponse", color: C.purple },
      '{ stat: { attribs: { directory: "/123456" },',
      '         file: [{ type: "file", name: "app.js", size: "48213", md5: "e4d9…" }] } }',
    ] }),
  ];

  const body = `<defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.muted}"/></marker></defs>
<rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
<text x="${x0 + 4}" y="40" font-family="${SANS}" font-size="20" font-weight="700" fill="${C.text}">What happens on every call</text>
${brand(W - x0 - 4, 36)}
<text x="${x0 + 4}" y="64" font-family="${SANS}" font-size="13.5" fill="${C.muted}">The client builds, signs and sends the request, then turns NetStorage's XML into a typed result.</text>
${arrows.join("\n")}
${cards.join("\n")}
<text x="${cx(0) + cw / 2 + 12}" y="${y2 + 30}" font-family="${SANS}" font-size="12.5" fill="${C.muted}">resolves with</text>
<text x="${cx(0) + cw / 2 + 12}" y="${y2 + 48}" font-family="${SANS}" font-size="12.5" fill="${C.muted}">the typed result</text>
<text x="${x0 + 4}" y="${H - 22}" font-family="${SANS}" font-size="12.5" fill="${C.muted}">Callbacks receive the same body plus the HTTP response: <tspan font-family="${MONO}" fill="${C.text}">ns.stat(path, (err, res, body) =&gt; …)</tspan></text>`;

  return svgDoc({
    width: W,
    height: H,
    title: "What happens on every call",
    desc: "Your code calls a method such as statAsync. The client builds the request path and X-Akamai-ACS-Action header, signs it with HMAC-SHA256 in the X-Akamai-ACS-Auth-Data and X-Akamai-ACS-Auth-Sign headers, sends it over https or http, optionally through a proxy, to Akamai NetStorage, and parses the XML response into a typed object that your code receives.",
    style: css.join("\n"),
    body,
  });
}

// ---------------------------------------------------------------------------
// API map: every operation at a glance
// ---------------------------------------------------------------------------

function apiMapSvg() {
  const W = 1000;
  const groups = [
    { title: "Transfer", color: C.gold, note: ["Buffers go straight to and from", "memory, with no temporary files."], items: [
      ["upload", "local file → NetStorage"],
      ["uploadBuffer", "Buffer → NetStorage"],
      ["download", "NetStorage → local file"],
      ["downloadBuffer", "NetStorage → memory"],
    ] },
    { title: "Browse", color: C.blue, note: ["Results are typed: DirResponse,", "ListResponse, DuResponse, StatResponse."], items: [
      ["dir", "list one directory"],
      ["list", "list recursively, resumable"],
      ["du", "file count and bytes used"],
      ["stat", "file or directory details"],
    ] },
    { title: "Manage", color: C.purple, items: [
      ["mkdir", "create a directory"],
      ["rmdir", "remove an empty directory"],
      ["rename", "rename or move a file"],
      ["symlink", "create a symlink"],
      ["mtime", "set modification time"],
      ["delete", "delete a file or symlink"],
      ["quickDelete", "delete a whole tree"],
    ] },
  ];
  const colW = 312;
  const gap = 16;
  const x0 = 16;
  const top = 84;
  const rowH = 30;
  const panelH = 52 + 7 * rowH + 10;
  const H = top + panelH + 120;

  const panels = groups.map((g, gi) => {
    const x = x0 + gi * (colW + gap);
    const rows = g.items
      .map(([name, what], i) => {
        const y = top + 66 + i * rowH;
        return `<text x="${x + 16}" y="${y}" font-family="${MONO}" font-size="13.5" fill="${C.text}">${esc(name)}</text>
<text x="${x + colW - 16}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="12.5" fill="${C.muted}">${esc(what)}</text>`;
      })
      .join("\n");
    return `<rect x="${x}" y="${top}" width="${colW}" height="${panelH}" rx="10" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
<rect x="${x}" y="${top}" width="${colW}" height="4" rx="2" fill="${g.color}"/>
<text x="${x + 16}" y="${top + 32}" font-family="${SANS}" font-size="15" font-weight="700" fill="${g.color}">${esc(g.title)}</text>
<text x="${x + colW - 16}" y="${top + 32}" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${C.muted}">name() · nameAsync()</text>
${rows}
${(g.note || []).map((l, i) => `<text x="${x + 16}" y="${top + panelH - 44 + i * 18}" font-family="${SANS}" font-size="12.5" fill="${C.muted}">${esc(l)}</text>`).join("\n")}`;
  });

  const by = top + panelH + 18;
  const half = (W - 2 * x0 - gap) / 2;
  const snippet = (x, label, code) => `<rect x="${x}" y="${by}" width="${half}" height="78" rx="10" fill="${C.panelHi}" stroke="${C.border}"/>
<text x="${x + 16}" y="${by + 26}" font-family="${SANS}" font-size="12.5" font-weight="600" fill="${C.muted}">${esc(label)}</text>
<text x="${x + 16}" y="${by + 54}" font-family="${MONO}" font-size="13" fill="${C.text}">${code}</text>`;

  const body = `<rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
<text x="${x0 + 4}" y="40" font-family="${SANS}" font-size="20" font-weight="700" fill="${C.text}">15 operations, each as a callback and a promise</text>
${brand(W - x0 - 4, 36)}
<text x="${x0 + 4}" y="64" font-family="${SANS}" font-size="13.5" fill="${C.muted}">Every method has an Async twin, and every response has a TypeScript type.</text>
${panels.join("\n")}
${snippet(x0, "Callback", `ns.stat(path, (err, res, body) =&gt; { … })`)}
${snippet(x0 + half + gap, "Promise", `const { stat } = await ns.statAsync(path)`)}`;

  return svgDoc({
    width: W,
    height: H,
    title: "ts-netstorageapi-akamai operations",
    desc: `Transfer: ${groups[0].items.map((i) => i[0]).join(", ")}. Browse: ${groups[1].items.map((i) => i[0]).join(", ")}. Manage: ${groups[2].items.map((i) => i[0]).join(", ")}. Each has a callback form and a promise form ending in Async.`,
    style: "",
    body,
  });
}

// ---------------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
const session = await captureSession();
const files = {
  "how-it-works.svg": howItWorksSvg(),
  "cli-demo.svg": terminalSvg(session),
  "api-map.svg": apiMapSvg(),
};
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), svg);
  console.log(`assets/${name}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} kB`);
}
const loopMatch = files["cli-demo.svg"].match(/animation: s0 ([\d.]+)s/);
if (loopMatch) {
  console.log(`terminal loop: ${loopMatch[1]} s`);
}
