// Builds the documentation site into website/dist/ for GitHub Pages.
//
//   npm run site            (needs devDependencies; runs TypeDoc for the API reference)
//
// Plain HTML pages, one per topic and one per method, so every page is fast,
// works without JavaScript and can be indexed by search engines.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { faq, groups, methods, org, orgLink, site } from "./content.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "dist");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Inline markdown used in content.mjs: `code` only.
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

// ------------------------------------------------------------ highlighting

const TS_KEYWORDS = /^(?:await|async|const|let|var|import|from|new|return|if|else|for|of|function|export|type|interface|true|false|null|undefined|void|as|unknown|any|string|number|boolean)$/;

function highlight(code, lang) {
  if (lang === "text" || lang === "http") return esc(code);
  const re = lang === "bash"
    ? /(#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\b(?:npm|npx|akamai-netstorage|export|curl|git|gh|node)\b)/gm
    : /(\/\/.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b[A-Za-z_$][\w$]*\b)|(\b\d[\d_]*(?:\.\d+)?\b)/gm;
  let html = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    html += esc(code.slice(last, m.index));
    const [tok, comment, str, word, num] = m;
    if (comment) html += `<span class="tok-c">${esc(tok)}</span>`;
    else if (str) html += `<span class="tok-s">${esc(tok)}</span>`;
    else if (word && lang === "bash") html += `<span class="tok-f">${esc(tok)}</span>`;
    else if (word && TS_KEYWORDS.test(word)) html += `<span class="tok-k">${esc(tok)}</span>`;
    else if (word && code[m.index + tok.length] === "(") html += `<span class="tok-f">${esc(tok)}</span>`;
    else if (num) html += `<span class="tok-n">${esc(tok)}</span>`;
    else html += esc(tok);
    last = m.index + tok.length;
  }
  return html + esc(code.slice(last));
}

const pre = (code, lang = "ts") => `<pre><code class="lang-${lang}">${highlight(code.trim(), lang)}</code></pre>`;

let tabSeq = 0;
function codeTabs(items) {
  const id = `t${++tabSeq}`;
  const tabs = items
    .map((it, i) => `<button type="button" role="tab" id="${id}-tab-${i}" aria-controls="${id}-panel-${i}" aria-selected="${i === 0}" data-kind="${it.kind}">${esc(it.label)}</button>`)
    .join("");
  const panels = items
    .map((it, i) => `<div role="tabpanel" id="${id}-panel-${i}" aria-labelledby="${id}-tab-${i}"${i ? " hidden" : ""}>${pre(it.code, it.lang)}</div>`)
    .join("");
  return `<div class="code-tabs"><div role="tablist" aria-label="Code examples">${tabs}</div>${panels}</div>`;
}

const table = (head, rows) =>
  `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;

const httpPill = (h) => `<span class="pill ${h === "POST" ? "post" : h === "PUT" ? "put" : ""}">${h}</span>`;

// ------------------------------------------------------------------ layout

const icon = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  // Moon in light mode, sun in dark mode: the icon shows what a click switches to.
  theme: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  github: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
};

// The gold Boffin Coders logo, the same in light and dark themes.
const logo = (r, cls = "brand-mark") => `<img class="${cls}" src="${r}brand/bc-gold.png" alt="Boffin Coders" width="30" height="30">`;

const nav = [
  ["guide/", "Guide"],
  ["methods/", "Methods"],
  ["playground/", "Playground"],
  ["cli/", "CLI"],
  ["api/", "API reference"],
];

function sidebar(r, current) {
  const link = (href, label, cls = "") =>
    `<a href="${r}${href}"${current === href ? ' aria-current="page"' : ""}${cls ? ` class="${cls}"` : ""}>${label}</a>`;
  const methodLinks = groups
    .map((g) => `<h4>${g.title}</h4>${methods.filter((m) => m.group === g.id).map((m) => link(`methods/${m.name}/`, m.name, "mono")).join("")}`)
    .join("");
  return `<nav class="sidebar" aria-label="Documentation">
<h4>Start here</h4>${link("basics/", "NetStorage basics")}${link("guide/", "Guide")}${link("playground/", "Playground")}${link("cli/", "Command line")}
<h4>Coming from elsewhere</h4>${link("migrate/", "From netstorageapi")}${link("upgrade/", "Upgrading to 1.1")}
<h4>Methods</h4>${link("methods/", "All methods")}
${methodLinks}
<h4>Reference</h4>${link("api/", "API reference")}<a href="${site.repo}/blob/master/CHANGELOG.md">Changelog</a><a href="${site.npm}">npm</a>
</nav>`;
}

const pages = [];
const searchIndex = [];

const orgNode = {
  "@type": "Organization",
  "@id": `${org.url}/#organization`,
  name: org.name,
  url: org.url,
  description: org.description,
  logo: `${site.url}brand/bc-gold.png`,
  sameAs: org.sameAs,
};

function structuredData(file, fullTitle, description, canonical) {
  const graph = [orgNode];
  if (file === "index.html") {
    graph.push(
      { "@type": "WebSite", "@id": `${site.url}#website`, name: site.name, url: site.url, publisher: { "@id": orgNode["@id"] } },
      {
        "@type": "SoftwareSourceCode",
        name: site.name,
        description: site.description,
        codeRepository: site.repo,
        programmingLanguage: "TypeScript",
        runtimePlatform: "Node.js",
        license: "https://opensource.org/licenses/MIT",
        version: pkg.version,
        author: { "@id": orgNode["@id"] },
        maintainer: { "@id": orgNode["@id"] },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: `${f.a} ${f.code}` },
        })),
      }
    );
  } else {
    graph.push({
      "@type": "WebPage",
      name: fullTitle,
      description,
      url: canonical,
      isPartOf: { "@id": `${site.url}#website` },
      publisher: { "@id": orgNode["@id"] },
    });
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function page({ file, title, seoTitle, description, body, current, docs = true, extraHead = "", scripts = [], base = "", noindex = false }) {
  const depth = file.split("/").length - 1;
  const r = depth ? "../".repeat(depth) : "./";
  const canonical = site.url + file.replace(/index\.html$/, "");
  const fullTitle = file === "index.html" ? site.homeTitle : `${seoTitle || title} · ${site.name}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${base ? `<base href="${base}">\n` : ""}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>${noindex ? '\n<meta name="robots" content="noindex">' : ""}
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(site.name)} by Boffin Coders">
<meta property="og:image" content="${site.url}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.name)}: ${esc(site.tagline)}, by Boffin Coders">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${site.url}og.png">
<meta name="author" content="Boffin Coders">
${noindex ? "" : structuredData(file, fullTitle, description, canonical)}
<meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="ns-root" content="${r}">
<link rel="icon" href="${r}favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap">
<link rel="stylesheet" href="${r}style.css">
<script>try{var t=localStorage.getItem("ns-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${extraHead}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
<button class="icon-btn menu-btn" type="button" data-menu aria-label="Menu" aria-expanded="false">${icon.menu}</button>
<a class="brand" href="${r}" aria-label="${site.name} home">${logo(r)}<span class="brand-text"><span class="brand-name">${site.name}</span><span class="brand-by">by Boffin Coders</span></span></a>
<nav class="topnav" aria-label="Main">${nav.map(([href, label]) => `<a href="${r}${href}"${current?.startsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
<div class="top-actions">
<button class="search-btn" type="button" data-search aria-label="Search">${icon.search}<span class="label">Search</span><kbd>⌘K</kbd></button>
<button class="icon-btn" type="button" data-theme-toggle aria-label="Toggle dark mode">${icon.theme}</button>
<a class="icon-btn" href="${site.repo}" aria-label="GitHub repository">${icon.github}</a>
</div>
</header>
${docs ? `<div class="layout">${sidebar(r, current)}<main id="main" class="content">${body}</main></div>` : `<main id="main">${body}</main>`}
<footer>
<a class="footer-brand" href="${orgLink("/open-source/ts-netstorageapi-akamai", "footer")}">${logo(r, "footer-logo")}<span>Built and maintained by Boffin Coders</span></a>
<p>${esc(site.name)} ${esc(pkg.version)} · MIT licence · <a href="${site.repo}">GitHub</a> · <a href="${site.npm}">npm</a></p>
<p>More open source by Boffin Coders: ${site.siblings.map((s) => `<a href="${s.url}">${s.name}</a>`).join(" · ")} · <a href="${site.hub}">All Boffin Coders open source</a></p>
<p>Based on Akamai's open-source <a href="https://www.npmjs.com/package/netstorageapi">netstorageapi</a> by Astin Choi.</p>
<p>An independent open-source project, not affiliated with or endorsed by Akamai Technologies, Inc. Akamai and NetStorage are trademarks of Akamai Technologies, Inc.</p>
</footer>
<dialog class="search" aria-label="Search the documentation"><input type="search" placeholder="Search pages and methods…" aria-label="Search"><ul></ul></dialog>
<script src="${r}search-index.js"></script>
<script src="${r}site.js"></script>
${scripts.map((s) => `<script src="${r}${s}"></script>`).join("\n")}
</body>
</html>
`;
  pages.push({ file, html, title: file === "index.html" ? site.homeTitle : seoTitle || title, body });
  if (title && !noindex) searchIndex.push({ title, text: description, url: file.replace(/index\.html$/, "") });
}

const figure = (r, name, alt) => `<figure class="figure"><img src="${r}assets/${name}" alt="${esc(alt)}" loading="lazy"></figure>`;

// -------------------------------------------------------------------- home

const comparison = table(
  ["", "<code>netstorageapi</code> 1.1.5 (Akamai)", "<code>ts-netstorageapi-akamai</code> " + esc(pkg.version)],
  [
    ["TypeScript types", "None", "Config, every method and every response"],
    ["<code>async</code>/<code>await</code>", "Callbacks only", "Every method also has a promise (<code>…Async</code>) form"],
    ["Upload or download from memory", "Files only", "<code>uploadBuffer</code>, <code>downloadBuffer</code>"],
    ["If a local file can't be read during an upload", "Reports the error, then still sends an empty upload, which can overwrite the file on NetStorage", "Reports the error once and sends nothing"],
    ["If the connection drops mid-response", "The callback is never called", "Reports an <code>ECONNRESET</code> error"],
    ["<code>npm audit</code> on a fresh install (Oct 2026)", "2 moderate (xml2js prototype pollution)", "0"],
    ["Install size", "12 packages, about 1,200 files", "8 packages, about 140 files"],
    ["Command line tool", "No", "<code>akamai-netstorage</code>"],
    ["Latest release", "March 2018", "Maintained, tested on Node 18, 20, 22 and 24 in CI"],
  ]
);

const quickStart = codeTabs([
  { kind: "promise", label: "Promise", lang: "ts", code: `import Netstorage from "ts-netstorageapi-akamai";

const ns = new Netstorage({
  hostname: "example-nsu.akamaihd.net",
  keyName: "upload-user",
  key: process.env.NETSTORAGE_KEY!,
  cpCode: "123456",
  ssl: true,
});

await ns.uploadAsync("./build/app.js", "/123456/static/");
const { stat } = await ns.statAsync("/123456/static/app.js");
console.log(stat.file[0].size, stat.file[0].md5);` },
  { kind: "callback", label: "Callback", lang: "ts", code: `const Netstorage = require("ts-netstorageapi-akamai").default;

const ns = new Netstorage({ hostname, keyName, key, cpCode: "123456", ssl: true });

ns.upload("./build/app.js", "/123456/static/", (err, res, body) => {
  if (err) throw err;
  console.log(res?.statusCode, body); // 200 { message: 'Request Processed.' }
});` },
  { kind: "cli", label: "CLI", lang: "bash", code: `export NETSTORAGE_HOST=example-nsu.akamaihd.net NETSTORAGE_KEYNAME=upload-user NETSTORAGE_KEY=... NETSTORAGE_CPCODE=123456
npx akamai-netstorage upload ./build/app.js static/
npx akamai-netstorage stat static/app.js` },
]);

page({
  file: "index.html",
  title: "",
  description: site.homeDescription,
  docs: false,

  body: `<section class="hero">
<p class="eyebrow">Open source · MIT · Node.js 18+</p>
<h1>Akamai NetStorage, <span class="accent">typed</span>.</h1>
<p class="lead">A Node.js and TypeScript client and CLI for the Akamai NetStorage API (the NetStorage HTTP API). Upload and download files or buffers, browse and manage directories, with promises or callbacks and a type for every response.</p>
<div class="hero-actions"><a class="btn primary" href="./basics/">New to NetStorage?</a><a class="btn" href="./guide/">Get started</a><a class="btn" href="./playground/">Open the playground</a><a class="btn" href="./api/">API reference</a></div>
<div class="install"><span>npm install ts-netstorageapi-akamai</span><button type="button" data-copy="npm install ts-netstorageapi-akamai">Copy</button></div>
<div class="badges"><span>CommonJS and ESM</span><span>2 runtime dependencies</span><span>npm audit: 0</span><span>Tested on Node 18–24</span></div>
</section>
<section class="home-section">${quickStart}</section>
<section class="home-section">
<h2>What happens on every call</h2>
<p class="lead">Each method builds the request, signs it the way NetStorage expects and turns the XML reply into a typed object.</p>
${figure("./", "how-it-works.svg", "Your code calls a method; the client builds the request, signs it with HMAC-SHA256, sends it to Akamai NetStorage and parses the XML reply into a typed object.")}
</section>
<section class="home-section">
<h2>Why this package</h2>
<p class="lead">Akamai's own Node.js client, <code>netstorageapi</code>, has not had a release since March 2018. This package keeps its method names and callback signatures, so switching is usually a one-line change, and adds what modern projects need.</p>
${comparison}
<p>Both send the same signed requests (HMAC-SHA256, version 5) and return the same parsed responses, so switching does not change what NetStorage sees. <a href="./migrate/">Migrate from netstorageapi →</a></p>
</section>
<section class="home-section">
<h2>Everything you need</h2>
<div class="grid">
<div class="card"><h3>Types for everything</h3><p>Config, options and every response are typed, with editor documentation on every method.</p></div>
<div class="card"><h3>Promises or callbacks</h3><p>Each method has an <code>Async</code> twin. Keep callbacks where you have them.</p></div>
<div class="card"><h3>Buffers in and out</h3><p>Upload generated content and read files into memory without temporary files.</p></div>
<div class="card"><h3>A command line tool</h3><p><code>akamai-netstorage</code> for scripts and CI, with JSON output and clear exit codes.</p></div>
<div class="card"><h3>Safe failure handling</h3><p>Failed uploads send nothing, and dropped connections report an error instead of hanging.</p></div>
<div class="card"><h3>Small and audited</h3><p>Two runtime dependencies, a 22 kB package and a clean <code>npm audit</code>.</p></div>
</div>
</section>
<section class="home-section">
<h2>Fifteen operations</h2>
<p class="lead">The 13 NetStorage actions the client supports, as ${methods.length} methods with a page each.</p>
${groups.map((g) => `<h3>${g.title}</h3><div class="grid">${methods.filter((m) => m.group === g.id).map((m) => `<a class="card" href="./methods/${m.name}/"><h3 class="mono">${m.name} ${httpPill(m.http)}</h3><p>${inline(m.summary)}</p></a>`).join("")}</div>`).join("")}
<h2 id="faq">Questions people ask</h2>
<div class="faq">
${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p>${pre(f.code, f.code.startsWith("np") ? "bash" : "ts")}</details>`).join("\n")}
</div>
<section class="built-by">
<img src="./brand/bc-gold.png" alt="Boffin Coders logo" width="56" height="56">
<div>
<h2>Built by Boffin Coders</h2>
<p>Boffin Coders designs and builds websites, web applications and mobile apps for businesses and agencies, and maintains this package as open source. Need Akamai NetStorage uploads, a media pipeline or a Node.js backend built for you?</p>
<p class="built-by-actions"><a class="btn primary" href="${orgLink("/hire/nodejs-developers", "home")}">Hire Node.js developers</a><a class="btn" href="${orgLink("/contact-us", "home")}">Talk to us</a><a class="btn" href="${orgLink("/", "home")}">boffincoders.com</a></p>
</div>
</section>
<div class="callout"><p><strong>Upgrading from 1.0.x?</strong> Version 1.1.0 is a drop-in upgrade: your code keeps working without changes. <a href="./upgrade/">See what changed →</a></p></div>
</section>`,
});

// ------------------------------------------------------------------ basics
// Facts from Akamai's NetStorage documentation; sources are linked on the page.

const AK = {
  start: "https://techdocs.akamai.com/netstorage-usage/reference/get-started",
  terms: "https://techdocs.akamai.com/netstorage-usage/reference/key-concepts-and-terms",
  format: "https://techdocs.akamai.com/netstorage-usage/reference/format-an-api-call",
  auth: "https://techdocs.akamai.com/netstorage-usage/reference/each-call-needs-signature-header-authentication",
  errors: "https://techdocs.akamai.com/netstorage-usage/reference/errors",
  limits: "https://techdocs.akamai.com/netstorage/docs/technical-limits-with-netstorage",
};

page({
  file: "basics/index.html",
  current: "basics/",
  title: "NetStorage basics",
  description: "What a first-time Akamai NetStorage HTTP API user needs to know: the -nsu.akamaihd.net endpoint, upload accounts and keys, CP code paths, request signing, clock skew, limits, replication and common errors.",
  body: `<p class="eyebrow">Start here</p>
<h1>NetStorage basics</h1>
<p class="lead">New to the NetStorage HTTP API? This page covers the setup and the rules that trip people up on their first request. It summarises Akamai's documentation, linked in each section.</p>

<h2 id="terms">The four things you need</h2>
${table(["Client option", "Akamai term", "What it is", "Where to find it"], [
  ["<code>hostname</code>", "Connection hostname (HTTP Domain Name)", "The API endpoint, always <code>[domain prefix]-nsu.akamaihd.net</code>. The prefix is chosen when the storage group is created.", "Control Center → NetStorage → <strong>Storage Groups</strong> → your group → <strong>HTTP Domain Name</strong>"],
  ["<code>keyName</code>", "Upload account name (<code>uploadAccountId</code>)", "The account that signs requests. It must not contain commas or spaces.", "NetStorage → <strong>Upload Accounts</strong>"],
  ["<code>key</code>", "HTTP API key", "The shared secret used to sign each request. It is never sent over the wire.", "Upload account → <strong>Access Methods</strong> → <strong>NetStorage HTTP CMS API</strong> → <strong>Copy Key</strong>"],
  ["<code>cpCode</code>", "CP code (upload directory)", "A numeric code that is the root directory of your storage group. Every path starts with it.", "Storage group details"],
])}
<p>Source: <a href="${AK.terms}">Key concepts and terms</a>.</p>

<h2 id="setup">Enable API access</h2>
<ol>
<li>In Control Center, go to <strong>Content delivery → Edge applications → NetStorage</strong> and open <strong>Upload Accounts</strong>.</li>
<li>Add an upload account or edit an existing one. Its name is your <code>keyName</code>.</li>
<li>In <strong>Access Methods</strong>, open the <strong>NetStorage HTTP CMS API</strong> tab and click <strong>Add HTTP API Key</strong>. A key is generated for you; <strong>Copy Key</strong> gives you the <code>key</code>.</li>
<li>Open <strong>Storage Groups</strong>, select your group and note the <strong>HTTP Domain Name</strong>: that is your <code>hostname</code>.</li>
</ol>
<div class="callout warn"><p><strong>Wait for propagation.</strong> A new or changed upload account can take up to 120 minutes to become active, and Akamai emails you when it is done. Requests before then fail with 403.</p></div>
<p>Source: <a href="${AK.start}">Get started</a>.</p>

<h2 id="endpoint">The endpoint</h2>
${pre(`https://example-nsu.akamaihd.net/123456/static/app.js
        ^ hostname              ^ CP code
                                       ^ your path`, "text")}
<ul>
<li>Use <code>ssl: true</code> for https (port 443); otherwise the client uses http (port 80). Your network must allow outgoing traffic on the port you use.</li>
<li>Every path starts with your CP code: <code>/123456/...</code>.</li>
<li>Paths may be up to 800 characters. NetStorage uses ISO-8859-1 by default, so characters in the range 32–255 work out of the box; the client encodes paths to match.</li>
</ul>
<p>Sources: <a href="${AK.format}">Format an API call</a>, <a href="${AK.limits}">Technical limits</a>.</p>

<h2 id="auth">How each request is signed</h2>
<p>The client does this for you, but knowing it helps when you debug a 403. Each request carries three headers:</p>
${table(["Header", "Contains"], [
  ["<code>X-Akamai-ACS-Action</code>", "The operation as a query string, starting with <code>version=1</code>, e.g. <code>version=1&amp;action=upload</code>. One action per request."],
  ["<code>X-Akamai-ACS-Auth-Data</code>", "<code>5, 0.0.0.0, 0.0.0.0, [unix time], [unique id], [keyName]</code>. Version 5 means HMAC-SHA256, the cipher Akamai recommends."],
  ["<code>X-Akamai-ACS-Auth-Sign</code>", "Base64 HMAC-SHA256, using your key, of the Auth-Data value, the request path, a newline, <code>x-akamai-acs-action:</code> plus the action value, and a final newline."],
])}
<div class="callout warn"><p><strong>Keep your clock in sync.</strong> The time in the signature must be within one minute of Akamai's time, or the request fails with 403. Run NTP on servers and CI runners.</p></div>
<p>See it for yourself in the <a href="../playground/">playground</a>, which shows the exact string that gets signed. Source: <a href="${AK.auth}">Signature header authentication</a>.</p>

<h2 id="limits">Limits worth knowing</h2>
${table(["Limit", "Value"], [
  ["Write operations (upload, delete, rename, mkdir, rmdir…)", "About 50 per second per storage group, averaged over 10 seconds"],
  ["Read operations (download, stat…)", "About 1,000 per second per storage group"],
  ["<code>dir</code> and <code>list</code>", "Each counts as 10 reads"],
  ["Largest object", "150 GB; split files over 100 GB into parts"],
  ["Path length", "800 characters, including directories"],
  ["Concurrent connections", "Up to 90 per upload account"],
])}
<p>Akamai calls these recommended maximums rather than guarantees: rate limiting can start earlier, and three-replica storage groups allow fewer writes. Exceeding them returns <code>429</code>; back off and retry. Very large directories can time out when listed, so page through them with <code>max_entries</code>. Source: <a href="${AK.limits}">Technical limits</a>.</p>

<h2 id="replication">Replication and reading back</h2>
<p>NetStorage keeps copies of your content in more than one place. The HTTP API does not chase requests to other replicas, so right after an upload, a <code>stat</code> or <code>download</code> can briefly see an older version or nothing at all. Akamai recommends serving content to users through a delivery product with NetStorage as the origin, and not downloading files larger than 1 GB through this API. This client also holds a download in memory before writing it, so plan memory for large files. Source: <a href="${AK.limits}">Technical limits</a>.</p>

<h2 id="errors">Common errors</h2>
${table(["Status", "Usually means", "What to check"], [
  ["<code>403</code>", "Authentication or authorization failed, or the action is not allowed with that HTTP method.", "Clock within one minute; the right <code>hostname</code>, <code>keyName</code> and <code>key</code>; the upload account has finished propagating. The response body often says more."],
  ["<code>404</code>", "The path does not exist.", "The CP code and path; replication delay right after an upload."],
  ["<code>412</code>", "A precondition failed.", "The content changed since you last read it."],
  ["<code>429</code>", "Too many requests.", "Slow down and retry with backoff; see the limits above."],
  ["<code>500</code>", "An error on Akamai's side.", "Retry later; contact Akamai support with the response details if it persists."],
])}
<p>Remember that the client resolves promise methods for HTTP errors; use the callback form to read <code>res.statusCode</code>. Source: <a href="${AK.errors}">Errors</a>.</p>
<p><a href="../guide/">Next: install and configure the client →</a></p>`,
});

// ------------------------------------------------------------------- guide

page({
  file: "guide/index.html",
  current: "guide/",
  title: "Guide",
  description: "Install, configure and use the TypeScript client for Akamai NetStorage: credentials, importing, promises and callbacks, responses, errors and proxies.",
  body: `<p class="eyebrow">Guide</p>
<h1>Getting started</h1>
<p class="lead">Everything you need to go from install to your first upload.</p>
<h2 id="install">Install</h2>
${pre("npm install ts-netstorageapi-akamai", "bash")}
<p>Node.js 18 or newer. Types are included; no <code>@types</code> package is needed.</p>
<h2 id="configure">Configure</h2>
${pre(`import Netstorage from "ts-netstorageapi-akamai";

const ns = new Netstorage({
  hostname: "example-nsu.akamaihd.net", // NetStorage HTTP API hostname
  keyName: "upload-user",               // upload account key name
  key: process.env.NETSTORAGE_KEY!,     // upload account key
  cpCode: "123456",                     // your CP code
  ssl: true,                            // https; defaults to false (http)
  proxy: "http://proxy.internal:3128",  // optional
});`)}
${table(["Option", "Type", "Description"], [
  ["<code>hostname</code>", "string", "The HTTP API hostname of your NetStorage upload account, e.g. <code>example-nsu.akamaihd.net</code>."],
  ["<code>keyName</code>", "string", "The key name (upload account) used to sign requests."],
  ["<code>key</code>", "string", "The HTTP API key. Read it from an environment variable or a secret store; never commit it."],
  ["<code>cpCode</code>", "string", "Your CP code. Every NetStorage path starts with it, e.g. <code>/123456/images/logo.png</code>."],
  ["<code>ssl</code>", "boolean", "Use https when <code>true</code>. Defaults to <code>false</code>."],
  ["<code>proxy</code>", "string", "Optional <code>http://</code> or <code>https://</code> proxy URL. Requests are tunnelled with CONNECT."],
])}
<div class="callout"><p>The hostname is your storage group's <code>[prefix]-nsu.akamaihd.net</code> domain, and the key name and key come from the HTTP API settings of an upload account in Akamai Control Center. New to this? Read <a href="../basics/">NetStorage basics</a> first.</p></div>
<h2 id="importing">Importing</h2>
${codeTabs([
  { kind: "import-ts", label: "TypeScript / bundlers", lang: "ts", code: `import Netstorage from "ts-netstorageapi-akamai";` },
  { kind: "import-cjs", label: "CommonJS", lang: "ts", code: `const Netstorage = require("ts-netstorageapi-akamai").default;` },
  { kind: "import-esm", label: "Native ESM", lang: "ts", code: `import pkg from "ts-netstorageapi-akamai";
const Netstorage = pkg.default;` },
])}
<h2 id="styles">Promises and callbacks</h2>
<p>Every method comes in two forms. Callbacks receive <code>(err, response, body)</code>, where <code>response</code> is Node's <code>http.IncomingMessage</code>; promise methods end in <code>Async</code> and resolve with the body.</p>
${codeTabs([
  { kind: "promise", label: "Promise", lang: "ts", code: `const { du } = await ns.duAsync("/123456");` },
  { kind: "callback", label: "Callback", lang: "ts", code: `ns.du("/123456", (err, res, body) => {
  if (err) throw err;
  console.log(res?.statusCode, body?.du["du-info"][0].bytes);
});` },
])}
<h2 id="responses">Responses and errors</h2>
<ul>
<li>XML responses are parsed: the root element's attributes become <code>attribs</code>, and each child element becomes a list of its attributes, e.g. <code>body.stat.file[0].name</code>. All values are strings.</li>
<li>Plain-text bodies are returned as <code>{ message }</code>. An empty <code>200</code> upload response becomes <code>{ message: "Request Processed." }</code>.</li>
<li><strong>HTTP errors do not throw.</strong> Network errors, invalid arguments and local file errors reject the promise (or reach <code>err</code>), but a <code>403</code> or <code>404</code> resolves with the parsed error body, as in Akamai's own client. Use the callback form when you need the status code.</li>
<li>A connection that drops before the response is complete reports an <code>ECONNRESET</code> error.</li>
</ul>
${pre(`ns.stat("/123456/maybe.txt", (err, res, body) => {
  if (err) throw err;            // network or argument error
  if (res?.statusCode === 404) { /* not found */ }
});`)}
<p>Try the response shapes in the <a href="../playground/#xml">XML explorer</a>.</p>
<h2 id="proxy">Proxy</h2>
${pre(`const ns = new Netstorage({ ...config, proxy: "http://user:pass@proxy.internal:3128" });`)}
<p>Requests go through the proxy with <code>CONNECT</code>, for both <code>ssl: true</code> and <code>ssl: false</code>. The proxy library is only loaded when a proxy is set.</p>
<h2 id="types">TypeScript</h2>
${pre(`import Netstorage, { AkamaiConfig, DirResponse, DirResponseFile, StatResponse } from "ts-netstorageapi-akamai";

const files: DirResponseFile[] = (await ns.dirAsync("/123456")).stat.file;`)}
<p>Every type is listed in the <a href="../api/">API reference</a>.</p>
<h2 id="node">Node support</h2>
<p>Node.js 18, 20, 22 and 24 are tested in CI. The package is CommonJS and works with <code>require()</code> and <code>import</code>.</p>`,
});

// ----------------------------------------------------------------- methods

page({
  file: "methods/index.html",
  current: "methods/",
  title: "Methods",
  description: "All 15 NetStorage operations of ts-netstorageapi-akamai with their promise and callback forms, HTTP method and NetStorage action.",
  body: `<p class="eyebrow">Methods</p>
<h1>All methods</h1>
<p class="lead">Fifteen operations, each with a callback form and an <code>Async</code> promise form.</p>
${figure("../", "api-map.svg", "The 15 operations grouped as Transfer, Browse and Manage.")}
${table(["Method", "Promise form", "HTTP", "NetStorage action", "Returns"], methods.map((m) => [
  `<a href="./${m.name}/"><code>${m.name}</code></a>`,
  `<code>${m.name}Async</code>`,
  httpPill(m.http),
  `<code>${esc(m.action.replace(/&.*$/, ""))}</code>`,
  `<code>${m.returns}</code>`,
]))}`,
});

methods.forEach((m, i) => {
  const prev = methods[i - 1];
  const next = methods[i + 1];
  const tabs = [
    { kind: "promise", label: "Promise", lang: "ts", code: m.example },
    { kind: "callback", label: "Callback", lang: "ts", code: m.callbackExample },
  ];
  if (m.cli) tabs.push({ kind: "cli", label: "CLI", lang: "bash", code: `npx ${m.cli}` });
  const actionValue = m.action.endsWith("=") ? `version=1&action=${m.action}…` : `version=1&action=${m.action}`;
  page({
    file: `methods/${m.name}/index.html`,
    current: `methods/${m.name}/`,
    title: `${m.name}()`,
    seoTitle: m.seoTitle,
    description: `${m.summary} ${m.name} and ${m.name}Async in the TypeScript client for Akamai NetStorage: signature, parameters, example and response.`,
    body: `<p class="eyebrow">${groups.find((g) => g.id === m.group).title}</p>
<h1><code>${m.name}</code> ${httpPill(m.http)}</h1>
<p class="lead">${inline(m.summary)}</p>
${codeTabs(tabs)}
<h2>Signatures</h2>
${pre(`${m.asyncSig}\n${m.callbackSig}`)}
<h2>Parameters</h2>
${table(["Name", "Type", "Description"], m.params.map(([n, t, d]) => [`<code>${n}</code>`, `<code>${esc(t)}</code>`, inline(d)]))}
<h2>Returns</h2>
<p><code>${m.returns}</code></p>
${pre(m.result, "text")}
<h2>On the wire</h2>
${table(["", ""], [
  ["HTTP method", httpPill(m.http)],
  ["X-Akamai-ACS-Action", `<code>${esc(actionValue)}</code>`],
  ["Signed with", "<code>X-Akamai-ACS-Auth-Data</code> and <code>X-Akamai-ACS-Auth-Sign</code> (HMAC-SHA256)"],
  ["CLI", m.cli ? `<code>${esc(m.cli)}</code>` : "No CLI equivalent"],
])}
<p><a href="../../playground/?op=${m.name}">Build and sign this request in the playground →</a></p>
${m.notes.length ? `<h2>Notes</h2><ul>${m.notes.map((n) => `<li>${inline(n)}</li>`).join("")}</ul>` : ""}
<p style="display:flex;justify-content:space-between;gap:12px;margin-top:40px">${prev ? `<a href="../${prev.name}/">← ${prev.name}</a>` : "<span></span>"}${next ? `<a href="../${next.name}/">${next.name} →</a>` : ""}</p>`,
  });
});

// --------------------------------------------------------------------- CLI

page({
  file: "cli/index.html",
  current: "cli/",
  title: "Command line",
  description: "akamai-netstorage: a command line tool for Akamai NetStorage. Upload, download, list, stat and manage files from scripts and CI.",
  body: `<p class="eyebrow">Command line</p>
<h1><code>akamai-netstorage</code></h1>
<p class="lead">The package installs a command for scripts and CI. It has no extra dependencies.</p>
${figure("../", "cli-demo.svg", "Terminal session: upload a file, list a directory, show disk usage and download a file.")}
<h2>Credentials</h2>
<p>The upload key comes from the environment, never from a flag, so it stays out of shell history and process lists. Host, key name and CP code can come from the environment or from <code>--host</code>, <code>--key-name</code> and <code>--cp-code</code>.</p>
${pre(`export NETSTORAGE_HOST=example-nsu.akamaihd.net
export NETSTORAGE_KEYNAME=upload-user
export NETSTORAGE_KEY=...            # from your secret store
export NETSTORAGE_CPCODE=123456      # optional: relative paths go under /123456/`, "bash")}
${pre("npx akamai-netstorage ls images", "bash")}
<h2>Commands</h2>
${table(["Command", "Does"], [
  ["<code>ls &lt;path&gt;</code>", "List a directory (<code>--max-entries</code>, <code>--prefix</code>, <code>--start</code>, <code>--end</code>)"],
  ["<code>list &lt;path&gt;</code>", "List files recursively"],
  ["<code>du &lt;path&gt;</code>", "File count and bytes used"],
  ["<code>stat &lt;path&gt;</code>", "File or directory details"],
  ["<code>upload &lt;local&gt; &lt;remote&gt;</code>", "Upload a file (a remote ending in <code>/</code> keeps the file name)"],
  ["<code>download &lt;remote&gt; [local]</code>", "Download a file; written only when the request succeeds"],
  ["<code>cat &lt;remote&gt;</code>", "Write a file to stdout"],
  ["<code>mkdir</code> / <code>rmdir</code> / <code>rm &lt;path&gt;</code>", "Create a directory, remove an empty one, delete a file"],
  ["<code>rename &lt;from&gt; &lt;to&gt;</code>", "Rename or move a file"],
  ["<code>symlink &lt;target&gt; &lt;link&gt;</code>", "Create a symlink"],
  ["<code>mtime &lt;path&gt; &lt;unix-time&gt;</code>", "Set the modification time"],
  ["<code>quick-delete &lt;path&gt; --yes</code>", "Delete a directory and everything in it"],
])}
<h2>Options</h2>
${table(["Option", "Effect"], [
  ["<code>--json</code>", "Print the parsed response as JSON"],
  ["<code>--host</code>, <code>--key-name</code>, <code>--cp-code</code>", "Override the environment variables (the key can only come from <code>NETSTORAGE_KEY</code>)"],
  ["<code>--insecure-http</code>", "Use http instead of https"],
  ["<code>NETSTORAGE_PROXY</code>", "Environment variable with a proxy URL"],
])}
<h2>Exit codes</h2>
${table(["Code", "Meaning"], [["0", "Success"], ["1", "Request or HTTP error (the status is printed to stderr)"], ["2", "Usage error"]])}`,
});

// -------------------------------------------------------------- playground

const xmlSamples = {
  dir: { label: "dir response", type: "DirResponse", xml: `<?xml version="1.0" encoding="ISO-8859-1"?>
<stat directory="/123456/static">
<file type="dir" name="images" mtime="1793246400" bytes="1795089" files="12"/>
<file type="file" name="app.js" mtime="1793250060" size="48213" md5="e4d909c290d0fb1ca068ffaddf22cbd0"/>
<file type="symlink" name="latest.js" mtime="1793250060" target="app.js"/>
</stat>` },
  du: { label: "du response", type: "DuResponse", xml: `<?xml version="1.0" encoding="ISO-8859-1"?>
<du directory="/123456/static">
<du-info files="14" bytes="1852422"/>
</du>` },
  stat: { label: "stat response", type: "StatResponse", xml: `<?xml version="1.0" encoding="ISO-8859-1"?>
<stat directory="/123456/static">
<file type="file" name="app.js" mtime="1793250060" size="48213" md5="e4d909c290d0fb1ca068ffaddf22cbd0"/>
</stat>` },
  list: { label: "list response", type: "ListResponse", xml: `<?xml version="1.0" encoding="ISO-8859-1"?>
<list>
<file type="file" name="123456/static/app.js" size="48213" md5="e4d909c290d0fb1ca068ffaddf22cbd0" mtime="1793250060"/>
<resume start="123456/static/images/a.png"/>
</list>` },
  error: { label: "plain-text error", type: "{ message }", xml: "Forbidden" },
};

page({
  file: "playground/index.html",
  current: "playground/",
  title: "Playground",
  description: "Build and sign an Akamai NetStorage HTTP API request in your browser: see the X-Akamai-ACS headers, the signed string, a curl command and the TypeScript call. Parse NetStorage XML into the client's response shape.",
  scripts: ["playground.js"],
  extraHead: `<script>window.NS_METHODS=${JSON.stringify(methods.map((m) => ({ name: m.name, http: m.http, action: m.action, inputs: m.inputs, cli: m.cli ? `npx ${m.cli}` : null })))};window.NS_XML_SAMPLES=${JSON.stringify(xmlSamples)};</script>`,
  body: `<p class="eyebrow">Playground</p>
<h1>Request inspector</h1>
<p class="lead">See exactly what the client sends: the path, the <code>X-Akamai-ACS-*</code> headers, the string that gets signed and a ready <code>curl</code> command. Handy when NetStorage answers 403.</p>
<div class="callout warn"><p>Everything runs in your browser and nothing is sent anywhere. Still, prefer a test upload account over a production key. NetStorage only accepts a signature within one minute of its time, so a generated <code>curl</code> command works for about a minute.</p></div>
<div class="pg">
<form id="signer" autocomplete="off" onsubmit="return false">
<label>Operation<select id="op"></select></label>
<label>Hostname<input id="host" value="example-nsu.akamaihd.net" spellcheck="false"></label>
<div class="row"><label>Key name<input id="keyname" value="upload-user" spellcheck="false"></label><label>Key<input id="key" type="password" value="demo-key" spellcheck="false"></label></div>
<label class="check"><input id="reveal" type="checkbox"> Show key</label>
<label class="check"><input id="ssl" type="checkbox" checked> https (ssl: true)</label>
<label id="path-label">NetStorage path <input id="path" value="/123456/static/app.js" spellcheck="false"></label>
<label id="f-destination" hidden>New path<input id="destination" value="/123456/static/app.v2.js" spellcheck="false"></label>
<label id="f-target" hidden>Target<input id="target" value="/123456/static/app.v2.js" spellcheck="false"></label>
<label id="f-mtime" hidden>Unix time (seconds)<input id="mtime" value="1793250000" inputmode="numeric"></label>
<div id="f-dir" hidden><div class="row"><label>max_entries<input id="dir-max" placeholder="100"></label><label>prefix<input id="dir-prefix"></label></div><div class="row"><label>start<input id="dir-start"></label><label>end<input id="dir-end"></label></div></div>
<div id="f-list" hidden><div class="row"><label>max_entries<input id="list-max" placeholder="1000"></label><label>end<input id="list-end"></label></div></div>
<div class="row"><label>Time <span class="hint">auth data</span><input id="time" inputmode="numeric"></label><label>Unique ID <span class="hint">auth data</span><input id="uid" inputmode="numeric"></label></div>
<button class="btn" type="button" id="refresh">New time and ID</button>
<p class="hint">To check a request from your logs, paste its time and unique ID from <code>X-Akamai-ACS-Auth-Data</code> and compare the signature.</p>
</form>
<div class="pg-out">
<div><h3>HTTP request</h3><pre><code id="out-request"></code></pre></div>
<div><h3>String to sign</h3><pre><code id="out-signed"></code></pre></div>
<div><h3>curl</h3><pre><code id="out-curl"></code></pre></div>
<div><h3>TypeScript</h3><pre><code id="out-ts"></code></pre></div>
<div><h3>CLI example</h3><pre><code id="out-cli"></code></pre></div>
</div>
</div>
<h2 id="xml">XML explorer</h2>
<p>Paste a NetStorage XML reply to see the object the client returns. The shape matches the client: the root's attributes become <code>attribs</code>, and each child element becomes a list of its attributes.</p>
<div class="pg">
<form onsubmit="return false"><label>Example<select id="xml-preset"></select></label><label>XML<textarea id="xml-in" spellcheck="false"></textarea></label></form>
<div class="pg-out"><div><h3>Result <span class="hint" id="xml-type"></span></h3><pre><code id="xml-out"></code></pre></div></div>
</div>`,
});

// ----------------------------------------------------------------- migrate

page({
  file: "migrate/index.html",
  current: "migrate/",
  title: "Migrating from netstorageapi",
  description: "Switch from Akamai's netstorageapi to the TypeScript client: same config, method names and callbacks, usually a one-line change.",
  body: `<p class="eyebrow">Migrate</p>
<h1>From <code>netstorageapi</code></h1>
<p class="lead">The configuration object, method names, arguments and <code>(err, response, body)</code> callbacks match Akamai's <code>netstorageapi</code>, so in most code only the import changes.</p>
${pre(`- const Netstorage = require("netstorageapi");
+ const Netstorage = require("ts-netstorageapi-akamai").default;`, "text")}
${table(["netstorageapi", "ts-netstorageapi-akamai"], [
  ["<code>quick_delete(path, cb)</code>", "<code>quickDelete(path, cb)</code>"],
  ["Callbacks only", "Callbacks, plus <code>…Async</code> promise methods"],
  ["File upload and download only", "Plus <code>uploadBuffer</code> and <code>downloadBuffer</code>"],
  ["No types", "Types for config, methods and responses"],
])}
<p>All other methods (<code>dir</code>, <code>list</code>, <code>download</code>, <code>du</code>, <code>stat</code>, <code>mkdir</code>, <code>rmdir</code>, <code>mtime</code>, <code>delete</code>, <code>rename</code>, <code>symlink</code>, <code>upload</code>) have the same names and arguments, and requests are signed the same way.</p>
<h2>Then, optionally</h2>
<ul>
<li>Move callbacks to promises one call at a time: <code>ns.stat(p, cb)</code> becomes <code>await ns.statAsync(p)</code>.</li>
<li>Replace temporary files with <code>uploadBuffer</code> and <code>downloadBuffer</code>.</li>
<li>Add types to your own code with the exported response types.</li>
</ul>`,
});

// ----------------------------------------------------------------- upgrade

page({
  file: "upgrade/index.html",
  current: "upgrade/",
  title: "Upgrading to 1.1",
  description: "ts-netstorageapi-akamai 1.1.0 is a drop-in upgrade from 1.0.x: security fixes, bug fixes, a CLI and types, with no API changes.",
  body: `<p class="eyebrow">Upgrade</p>
<h1>Upgrading from 1.0.x</h1>
<p class="lead"><strong>Version 1.1.0 is a drop-in upgrade.</strong> Code that works with 1.0.4 keeps working without changes.</p>
${pre("npm install ts-netstorageapi-akamai@^1.1.0", "bash")}
<h2>What stays exactly the same</h2>
<ul>
<li>Every method name, argument, callback signature and resolved value.</li>
<li>The configuration object, error messages and validation.</li>
<li>The request on the wire: method, path, <code>X-Akamai-ACS-*</code> headers and signature, http/https choice, proxy handling.</li>
<li>Parsed responses for <code>dir</code>, <code>list</code>, <code>du</code>, <code>stat</code>, plain-text and error bodies.</li>
<li><code>import Netstorage from "ts-netstorageapi-akamai"</code>, <code>require("ts-netstorageapi-akamai").default</code>, and type imports from <code>ts-netstorageapi-akamai/dist/...</code>.</li>
</ul>
<h2>What is new</h2>
<div class="grid">
<div class="card"><h3>Security</h3><p><code>xml2js</code> upgraded to 0.6.2 and <code>lodash</code> removed. <code>npm audit</code> no longer reports this package.</p></div>
<div class="card"><h3>Bug fixes</h3><p>A failed upload no longer sends an empty file, and a dropped connection reports an error instead of hanging.</p></div>
<div class="card"><h3>Smaller</h3><p>The npm package is 22 kB instead of 92 kB, and installs about 1,100 fewer files.</p></div>
<div class="card"><h3>Additions</h3><p>A command line tool, exported types and editor documentation for every method.</p></div>
</div>
<h2>Differences a 1.0.4 user could notice</h2>
${table(["Change", "Who could notice"], [
  ["A failed upload reports its error once and sends nothing.", "Code that hit a local read error. Before, it also got a second callback with the empty upload's response."],
  ["<code>downloadAsync(path)</code> without a destination saves to the current directory.", "Code that passed no destination. Before, the call failed."],
  ["<code>download(\"dir/\", callback)</code> passes the error to the callback.", "Code that passed a directory path with two arguments. Before, it threw a <code>TypeError</code>."],
  ["A connection dropped mid-response reports an <code>ECONNRESET</code> error.", "Code that hit a dropped connection. Before, the promise never settled and the callback was never called."],
  ["<code>lodash</code> is no longer installed with this package.", "Apps that <code>require(\"lodash\")</code> without listing it in their own <code>package.json</code>. Run <code>npm install lodash</code>."],
  ["<code>src/</code> and <code>docs/</code> are no longer in the npm package.", "Only imports of <code>ts-netstorageapi-akamai/src/...</code>."],
  ["<code>\"engines\": { \"node\": \">=18\" }</code> is declared.", "Installs on Node 16 or older with npm's <code>engine-strict</code> setting on."],
])}
<p>Before release, the whole test suite also ran against the published 1.0.4 code, and the results matched except for the fixes above. Full details are in the <a href="${site.repo}/blob/master/CHANGELOG.md">changelog</a>.</p>`,
});

// ---------------------------------------------------------------------- 404

page({
  file: "404.html",
  title: "Page not found",
  description: "Page not found.",
  docs: false,
  // GitHub Pages serves this for any missing path, so every relative link must resolve
  // from the site root. The <base> element has to come before the first relative URL.
  base: "/akamai-netstorageapi-typescript/",
  noindex: true,
  body: `<section class="hero"><h1>Page not found</h1><p class="lead">That page does not exist. Try the <a href="./">home page</a> or press <kbd>/</kbd> to search.</p></section>`,
});

// ------------------------------------------------------------------- write

fs.rmSync(out, { recursive: true, force: true });
for (const p of pages) {
  const target = path.join(out, p.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, p.html);
}
for (const f of fs.readdirSync(path.join(here, "static"))) fs.copyFileSync(path.join(here, "static", f), path.join(out, f));
fs.mkdirSync(path.join(out, "assets"));
for (const f of ["how-it-works.svg", "api-map.svg", "cli-demo.svg"]) fs.copyFileSync(path.join(root, "assets", f), path.join(out, "assets", f));
fs.mkdirSync(path.join(out, "brand"));
for (const f of ["bc-gold.png"]) fs.copyFileSync(path.join(root, "assets/brand", f), path.join(out, "brand", f));
fs.writeFileSync(path.join(out, "search-index.js"), `window.NS_SEARCH=${JSON.stringify([
  ...searchIndex,
  { title: "API reference", text: "Every class, method and type, generated from the source with TypeDoc.", url: "api/" },
])};\n`);
fs.writeFileSync(path.join(out, ".nojekyll"), "");
// llms.txt (llmstxt.org): a short brief for AI assistants, with every page as text in llms-full.txt.
fs.writeFileSync(
  path.join(out, "llms.txt"),
  `# ${site.name}

> Akamai NetStorage client and CLI for Node.js and TypeScript. It wraps the Akamai NetStorage API (the NetStorage HTTP API) with typed, promise-based methods to upload, download, list and manage files, and keeps the configuration, method names and callbacks of Akamai's netstorageapi package.

Maintained by Boffin Coders (${org.url}). Every docs page as plain text: [llms-full.txt](${site.url}llms-full.txt).

## Key facts

- Install: \`npm install ${site.name}\` (version ${pkg.version}, MIT licence)
- Runtime: Node.js ${pkg.engines.node}; type definitions included
- Runtime dependencies: ${Object.keys(pkg.dependencies).join(" and ")}
- Command line tool: \`akamai-netstorage\`, configured from NETSTORAGE_HOST, NETSTORAGE_KEYNAME and NETSTORAGE_KEY
- Requests are signed for you with HMAC-SHA256 (version 5) in the X-Akamai-ACS-Auth-Data and X-Akamai-ACS-Auth-Sign headers
- Tested against a mock NetStorage server on Node 18, 20, 22 and 24: ${site.repo}/actions/workflows/ci.yml
- Drop-in for netstorageapi: usually only the import changes; quick_delete is quickDelete here

## When to use it

- Uploading build output, media or generated files to Akamai NetStorage from Node.js or a CI job
- Uploading content held in memory (a Buffer) without writing a temp file
- Listing, inspecting, renaming, symlinking and deleting files on NetStorage from code or a shell
- Replacing netstorageapi in a TypeScript project that wants types and promises

## When not to use it

- Akamai Object Storage (Linode) is S3-compatible and is not covered; use an S3 client for it
- Browsers: the client runs in Node.js and needs your NetStorage key, which must stay on the server
- Directory sync, streaming and retries are not built in; you call one method per file

## API

Each method has a callback form and a promise form (the same name plus Async), on \`new Netstorage({ hostname, keyName, key, cpCode, ssl })\`.

${methods.map((m) => `- [${m.name}](${site.url}methods/${m.name}/): ${m.summary} (${m.http})`).join("\n")}

## FAQ

${faq.map((f) => `### ${f.q}\n\n${f.a}\n\n\`${f.code}\``).join("\n\n")}

## Docs

- [Home](${site.url})
- [NetStorage basics](${site.url}basics/): endpoint, upload accounts and keys, request signing, limits and common errors
- [Guide](${site.url}guide/): install, configure, promises and callbacks, responses and errors, proxy
- [Methods](${site.url}methods/)
- [Command line](${site.url}cli/)
- [Migrating from netstorageapi](${site.url}migrate/)
- [Upgrading to 1.1](${site.url}upgrade/)
- [API reference](${site.url}api/)
- [Full text of the docs](${site.url}llms-full.txt)

## Optional

- npm: ${site.npm}
- Source: ${site.repo}
- Maintainer: ${org.url}
${site.siblings.map((s) => `- [${s.name}](${s.url}): ${s.summary}`).join("\n")}
- [All Boffin Coders open source](${site.hub})
`
);

// llms-full.txt: each page's main content as Markdown-like text, links made absolute.
const decode = (t) =>
  t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&middot;/g, "·").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const abs = (href, file) => (/^[a-z]+:/i.test(href) || href.startsWith("#") ? href : new URL(href, site.url + file).href);
const toText = (html, file) =>
  decode(
    html
      .replace(/<(script|style|svg|form|button|select|textarea)[\s\S]*?<\/\1>/gi, "")
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => `\n\n\`\`\`\n${c.replace(/<[^>]+>/g, "").trim()}\n\`\`\`\n\n`)
      .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${"#".repeat(Number(n) + 1)} ${t.replace(/<[^>]+>/g, "").trim()}\n\n`)
      .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, "\n\n### $1\n\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => `[${t.replace(/<[^>]+>/g, "").trim()}](${abs(h, file)}) `)
      .replace(/<\/(span|strong|em|dt|dd)>(?=<)/gi, "</$1> ")
      .replace(/<img [^>]*alt="([^"]*)"[^>]*>/gi, (_, a) => (a ? `[Image: ${a}]` : ""))
      .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(td|th)>/gi, " | ")
      .replace(/<tr[^>]*>/gi, "\n| ")
      .replace(/<(p|div|section|ul|ol|table|details|br)[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
fs.writeFileSync(
  path.join(out, "llms-full.txt"),
  `# ${site.name}: full documentation\n\n> ${site.homeDescription}\n\nSource: ${site.url} · Summary: ${site.url}llms.txt\n\n` +
    pages
      .filter((p) => p.file !== "404.html")
      .map((p) => `---\n\n# ${p.title}\n\nURL: ${site.url}${p.file.replace(/index\.html$/, "")}\n\n${toText(p.body, p.file)}`)
      .join("\n\n") +
    "\n"
);
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}sitemap.xml\n`);
const urls = [...pages.filter((p) => p.file !== "404.html").map((p) => p.file.replace(/index\.html$/, "")), "api/"];
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join("\n")}\n</urlset>\n`
);

// API reference from the TypeScript sources.
execFileSync(process.execPath, [
  path.join(root, "node_modules/typedoc/bin/typedoc"),
  "--options", path.join(here, "typedoc.json"),
], { cwd: root, stdio: "inherit" });

console.log(`website/dist: ${pages.length} pages plus the API reference`);
