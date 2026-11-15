"use strict";

/**
 * Preview build for the Start here patch.
 *
 * Copies the patched pages and the unchanged 2026-11-14 catalog into out/.
 * It does not ingest, score, or modify catalog.json.
 * Unpatched routes are not in this folder; preview/vercel.json proxies them
 * to the immutable home-refresh deployment that produced the baseline.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pages = path.join(__dirname, "pages");
const catalogSrc = fs.existsSync(path.join(__dirname, "catalog.json"))
  ? path.join(__dirname, "catalog.json")
  : path.join(root, "test/fixtures/catalog-2026-11-14.json");
const out = path.join(__dirname, "out");

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyTree(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else if (entry.name !== "start-here-selection.json") copyFile(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
copyTree(pages, out);
let catalogCount = null;
let catalogUpdated = null;
if (fs.existsSync(catalogSrc)) {
  copyFile(catalogSrc, path.join(out, "data/catalog.json"));
  const catalog = JSON.parse(fs.readFileSync(path.join(out, "data/catalog.json"), "utf8"));
  if (catalog.games.length !== 1321 || catalog.updatedOn !== "2026-11-14") {
    throw new Error("Catalog baseline mismatch");
  }
  catalogCount = catalog.games.length;
  catalogUpdated = catalog.updatedOn;
}
const en = fs.readFileSync(path.join(out, "en/index.html"), "utf8");
const zh = fs.readFileSync(path.join(out, "zh/index.html"), "utf8");
if (!en.includes('id="start"') || !zh.includes('id="start"')) {
  throw new Error("Start here rail missing");
}
if (!en.includes("1,321") || !zh.includes("1,321")) {
  throw new Error("Catalog count missing");
}
if (en.includes("b.visual") || zh.includes("b.visual") || en.includes("quality") || zh.includes("quality")) {
  throw new Error("Score field leaked into the homepage");
}
console.log(JSON.stringify({
  catalogCount,
  catalogUpdated,
  startBeforeDiary: en.indexOf('id="start"') < en.indexOf("catalog-increment-20261026"),
}));
