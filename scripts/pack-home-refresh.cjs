#!/usr/bin/env node
"use strict";

/**
 * Pack a mirrored static tree into the home-refresh source layout:
 * pages.json.gz + release-manifest.json + static binaries + build.cjs.
 *
 *   node scripts/pack-home-refresh.cjs --root /tmp/f343/mirror --out /tmp/f343/src
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const BINARY = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif"]);

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function walk(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return files;
}

const BUILD = `const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const m=JSON.parse(fs.readFileSync('release-manifest.json')),pages=JSON.parse(zlib.gunzipSync(fs.readFileSync('pages.json.gz')));
for(const [file,meta] of Object.entries(m.files)){
  if(file.includes('..')||path.isAbsolute(file))throw Error('Invalid path');
  const b=pages[file]===undefined?fs.readFileSync(path.join('static',file)):Buffer.from(pages[file]);
  if(b.length!==meta.size||crypto.createHash('sha256').update(b).digest('hex')!==meta.sha256)throw Error('Integrity failure: '+file);
  const dest=path.join('out',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b)
}
const c=JSON.parse(fs.readFileSync('out/data/catalog.json'));
if(c.games.length!==m.catalogCount||c.updatedOn!==m.catalogUpdated)throw Error('Catalog mismatch');
console.log(JSON.stringify({verifiedFiles:Object.keys(m.files).length,catalogCount:c.games.length,catalogUpdated:c.updatedOn}));
`;

const VERCEL = `{
  "buildCommand": "node build.cjs",
  "outputDirectory": "out",
  "installCommand": "echo No dependencies",
  "functions": {
    "api/v1/games.js": { "includeFiles": "out/data/catalog.json" },
    "api/v1/health.js": { "includeFiles": "out/data/catalog.json" }
  },
  "headers": [
    { "source": "/data/catalog.json", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
`;

function main() {
  const root = arg("--root");
  const out = arg("--out");
  if (!root || !out) throw new Error("Pass --root and --out");
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8"));
  const pages = {};
  const files = {};
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const rel of walk(root)) {
    if (rel.includes("..")) throw new Error("bad path " + rel);
    const buf = fs.readFileSync(path.join(root, rel));
    const binary = BINARY.has(path.extname(rel).toLowerCase()) || buf.includes(0);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    files[rel] = { sha256: hash, size: buf.length };
    if (binary) {
      const dest = path.join(out, "static", rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
    } else {
      pages[rel] = buf.toString("utf8");
      if (Buffer.byteLength(pages[rel]) !== buf.length) throw new Error("utf8 size drift " + rel);
    }
  }
  const manifest = {
    catalogCount: catalog.games.length,
    catalogUpdated: catalog.updatedOn,
    files,
  };
  fs.writeFileSync(path.join(out, "release-manifest.json"), JSON.stringify(manifest));
  fs.writeFileSync(path.join(out, "pages.json.gz"), zlib.gzipSync(Buffer.from(JSON.stringify(pages))));
  fs.writeFileSync(path.join(out, "build.cjs"), BUILD);
  fs.writeFileSync(path.join(out, "vercel.json"), VERCEL);
  console.log(JSON.stringify({
    files: Object.keys(files).length,
    pages: Object.keys(pages).length,
    catalogCount: manifest.catalogCount,
    catalogUpdated: manifest.catalogUpdated,
    gzipBytes: fs.statSync(path.join(out, "pages.json.gz")).size,
  }));
}

main();
