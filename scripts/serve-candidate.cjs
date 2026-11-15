#!/usr/bin/env node
"use strict";

/**
 * Local non-production server for the candidate pack.
 * It does not deploy and it does not read the preview proxy.
 *
 *   node scripts/serve-candidate.cjs 8765
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { buildCandidate } = require("./pr4-candidate.cjs");
const { SNAPSHOT } = require("./production-pack.cjs");

const port = Number(process.argv[2] || 8765);
const candidate = buildCandidate();
const staticDir = path.join(SNAPSHOT, "static");

function contentType(rel) {
  if (rel.endsWith(".json")) return "application/json; charset=utf-8";
  if (rel.endsWith(".svg")) return "image/svg+xml";
  if (rel.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (rel.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (rel.endsWith(".png")) return "image/png";
  if (rel.endsWith(".jpg") || rel.endsWith(".jpeg")) return "image/jpeg";
  if (rel.endsWith(".webp")) return "image/webp";
  if (rel.endsWith(".gif")) return "image/gif";
  return "text/html; charset=utf-8";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (rel === "") rel = "en/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  if (Object.prototype.hasOwnProperty.call(candidate.pages, rel)) {
    res.writeHead(200, { "content-type": contentType(rel) });
    res.end(candidate.pages[rel]);
    return;
  }
  const file = path.resolve(staticDir, rel);
  if (file.startsWith(staticDir + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "content-type": contentType(rel) });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ port, pages: Object.keys(candidate.pages).length, production: false }));
});
