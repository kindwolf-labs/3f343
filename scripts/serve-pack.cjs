#!/usr/bin/env node
"use strict";

/**
 * Serve one unpacked candidate folder. No repo and no deploy.
 *
 *   node serve-pack.cjs . 8766
 *
 * The folder needs pages.json.gz and static/ beside this file,
 * or pass that folder as the first argument.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 8766);
const pages = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, "pages.json.gz"))).toString("utf8"));
const staticDir = path.join(root, "static");

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
  if (Object.prototype.hasOwnProperty.call(pages, rel)) {
    res.writeHead(200, { "content-type": contentType(rel) });
    res.end(pages[rel]);
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
  console.log(JSON.stringify({ port, root, pages: Object.keys(pages).length, production: false }));
});
