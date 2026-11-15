"use strict";

/**
 * Verify and repack the home-refresh content snapshot.
 *
 * The snapshot is candidate-morning-20261115, which is byte-identical to
 * release-fable-check-20261115 and matches the live origin for the routes
 * checked on 2026-11-15. It is not built by preview/vercel.json.
 *
 * Binary files named in the manifest under media/, assets/, and
 * catalog-assets/ are not inside pages.json.gz. This module checks their
 * manifest rows and does not invent the bytes.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SNAPSHOT = path.join(__dirname, "..", "snapshot", "home-refresh-20261115");
const EXPECTED = {
  pagesSha256: "9d7579d6806b9171b7d94f332f0f59675527c2e79d58a2b87d567cee846575ae",
  pagesSize: 1079910,
  manifestSha256: "6f068e44ca8321cff41b2a548997a449b33de3d761fd258d8ebbee28fc47da1a",
  manifestSize: 370497,
  catalogSha256: "e18f8722cbde44063a5b9069809030ca6ade3ad8839331ea31400a9d977c3066",
  catalogSize: 847925,
  catalogUpdated: "2026-11-14",
  catalogCount: 1321,
  idMin: 1,
  idMax: 1321,
  live: {
    "en/index.html": "db34304fddc5006668160a2aec52b472177f3529e60384247c531e8b9f009e01",
    "zh/index.html": "6d6c863f61a60300821208eef0a8d6ddec66add974da8f212da0dbcd8e88e3ca",
    "llms.txt": "45f6e18b0602d4d05e5a6d8123d891f2322a193ed20b7fa5a77329a8c0292338",
    "robots.txt": "0b7fbbbc235eae9d7ad4da86f65bb767c70f0cfc1fa5e09972f199dbb8a5d6b2",
    "latest/index.html": "8b27d98fca54d51cd89a296ac2a7cce657f49426d2e9c53698b18f34e738178f",
    "en/games/browser-ai-games/index.html": "3d5f7c36866c7b097451db78fd8306d4f1572a9721df928f656acf234e3b6d93",
    "en/games/fable-52-mid-november-2026/index.html": "1d953a46878a060e96641a590434f6fb8914281cd754164a9ec962f196b14134",
    "data/catalog.json": "e18f8722cbde44063a5b9069809030ca6ade3ad8839331ea31400a9d977c3066",
  },
};

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function isImageKey(key) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(key);
}

function loadSnapshot(dir = SNAPSHOT) {
  const pagesPath = path.join(dir, "pages.json.gz");
  const manifestPath = path.join(dir, "release-manifest.json");
  const pagesGz = fs.readFileSync(pagesPath);
  const manifestBytes = fs.readFileSync(manifestPath);
  const pages = JSON.parse(zlib.gunzipSync(pagesGz).toString("utf8"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  return { dir, pagesPath, manifestPath, pagesGz, manifestBytes, pages, manifest };
}

function verifySnapshot(loaded = loadSnapshot()) {
  const errors = [];
  const { pagesGz, manifestBytes, pages, manifest } = loaded;
  if (pagesGz.length !== EXPECTED.pagesSize || sha256(pagesGz) !== EXPECTED.pagesSha256) {
    errors.push("pages.json.gz is not the preserved morning snapshot");
  }
  if (manifestBytes.length !== EXPECTED.manifestSize || sha256(manifestBytes) !== EXPECTED.manifestSha256) {
    errors.push("release-manifest.json is not the preserved morning snapshot");
  }
  const files = manifest.files || {};
  const pageKeys = Object.keys(pages);
  const staticKeys = [];
  for (const [key, meta] of Object.entries(files)) {
    if (pages[key] === undefined) {
      staticKeys.push(key);
      if (!isImageKey(key)) errors.push("manifest file missing from pack: " + key);
      if (!meta || meta.size == null || !meta.sha256) errors.push("static manifest row incomplete: " + key);
      continue;
    }
    if (!meta) errors.push("pack page missing from manifest: " + key);
  }
  for (const key of pageKeys) {
    const meta = files[key];
    if (!meta) {
      errors.push("pack page missing from manifest: " + key);
      continue;
    }
    const body = Buffer.from(pages[key], "utf8");
    if (body.length !== meta.size || sha256(body) !== meta.sha256) {
      errors.push("hash mismatch: " + key);
    }
  }
  const catalogRaw = pages["data/catalog.json"];
  if (typeof catalogRaw !== "string") errors.push("catalog missing");
  const catalog = JSON.parse(catalogRaw || "{}");
  const games = catalog.games || [];
  const ids = games.map((game) => Number(game.id)).sort((a, b) => a - b);
  if (catalog.updatedOn !== EXPECTED.catalogUpdated || catalog.catalog_updated !== EXPECTED.catalogUpdated) {
    errors.push("catalog date is " + catalog.updatedOn);
  }
  if (games.length !== EXPECTED.catalogCount || ids.length !== EXPECTED.catalogCount) {
    errors.push("catalog count is " + games.length);
  }
  if (ids[0] !== EXPECTED.idMin || ids[ids.length - 1] !== EXPECTED.idMax) {
    errors.push("catalog id range changed");
  }
  const idGaps = [];
  for (let id = EXPECTED.idMin; id <= EXPECTED.idMax; id += 1) {
    if (!ids.includes(id)) idGaps.push(id);
  }
  if (idGaps.length) errors.push("missing ids " + idGaps.slice(0, 10).join(","));
  if (sha256(Buffer.from(catalogRaw, "utf8")) !== EXPECTED.catalogSha256) {
    errors.push("catalog bytes changed");
  }
  if (pages["en/index.html"] && pages["en/index.html"].includes('id="start"')) {
    errors.push("production snapshot contains the unpublished Start here rail");
  }
  if (!pages["en/games/fable-52-mid-november-2026/index.html"]) {
    errors.push("fable page missing from the morning snapshot");
  }
  if (pages["en/latest/index.html"]) {
    errors.push("en/latest unexpectedly inside the content pack");
  }
  const staticReport = verifyStaticAssets(path.join(loaded.dir, "static"), manifest);
  if (staticReport.errors.length) errors.push(...staticReport.errors);
  for (const [key, hash] of Object.entries(EXPECTED.live)) {
    if (!hash) continue;
    const body = pages[key];
    if (!body || sha256(Buffer.from(body, "utf8")) !== hash) errors.push("live anchor mismatch: " + key);
  }
  if (errors.length) {
    const error = new Error(errors.join("\n"));
    error.errors = errors;
    throw error;
  }
  return {
    pages: pageKeys.length,
    manifestFiles: Object.keys(files).length,
    staticFiles: staticKeys.length,
    catalogCount: games.length,
    catalogUpdated: catalog.updatedOn,
    idMin: ids[0],
    idMax: ids[ids.length - 1],
    idGaps: idGaps.length,
    contentSha256: contentDigest(pages),
    staticAssets: staticReport.count,
  };
}

function listFiles(dir, base = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, acc);
    else acc.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return acc;
}

function verifyStaticAssets(dir, manifest) {
  const errors = [];
  const files = manifest.files || {};
  const imageKeys = Object.keys(files).filter(isImageKey).sort();
  const onDisk = listFiles(dir).sort();
  if (!fs.existsSync(dir)) errors.push("static directory missing: " + dir);
  for (const key of imageKeys) {
    const meta = files[key];
    const file = path.join(dir, key);
    if (!fs.existsSync(file)) {
      errors.push("static file missing: " + key);
      continue;
    }
    const body = fs.readFileSync(file);
    if (body.length !== meta.size || sha256(body) !== meta.sha256) errors.push("static hash mismatch: " + key);
  }
  for (const key of onDisk) {
    if (!imageKeys.includes(key)) errors.push("unexpected static file: " + key);
  }
  if (imageKeys.length !== 100) errors.push("manifest image count " + imageKeys.length);
  return { count: imageKeys.length, onDisk: onDisk.length, errors };
}

function contentDigest(pages) {
  const hash = crypto.createHash("sha256");
  for (const key of Object.keys(pages).sort()) {
    hash.update(key);
    hash.update("\0");
    hash.update(Buffer.from(pages[key], "utf8"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function repack(pages) {
  const ordered = {};
  for (const key of Object.keys(pages).sort()) ordered[key] = pages[key];
  const json = Buffer.from(JSON.stringify(ordered), "utf8");
  return zlib.gzipSync(json, { level: 9, mtime: 0 });
}

module.exports = {
  EXPECTED,
  SNAPSHOT,
  contentDigest,
  isImageKey,
  loadSnapshot,
  repack,
  sha256,
  verifySnapshot,
  verifyStaticAssets,
};
