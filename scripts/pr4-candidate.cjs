#!/usr/bin/env node
"use strict";

/**
 * Build a candidate content pack by applying the PR4 Start here patch
 * onto the verified production snapshot. The result is not production
 * and is not the preview proxy in preview/vercel.json.
 *
 *   node scripts/pr4-candidate.cjs --out /tmp/pr4-candidate
 */

const fs = require("fs");
const path = require("path");
const { patchDetail, patchHomepage, selectStartHere } = require("../site/start-here.cjs");
const { loadSnapshot, repack, verifySnapshot } = require("./production-pack.cjs");

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function buildCandidate(snapshot = loadSnapshot()) {
  verifySnapshot(snapshot);
  const pages = { ...snapshot.pages };
  const catalog = JSON.parse(pages["data/catalog.json"]);
  const picks = selectStartHere(catalog.games);
  if (picks.length < 4) throw new Error("Start here selection too small");
  const bySlug = new Map(catalog.games.map((game) => [game.slug, game]));
  for (const locale of ["en", "zh"]) {
    const homeKey = locale + "/index.html";
    pages[homeKey] = patchHomepage(pages[homeKey], picks, locale);
    for (const pick of picks) {
      const game = bySlug.get(pick.game.slug);
      const key = `${locale}/games/${game.slug}/index.html`;
      if (!pages[key]) throw new Error("snapshot missing " + key);
      pages[key] = patchDetail(pages[key], game, pick, catalog.games, locale);
    }
  }
  if (pages["data/catalog.json"] !== snapshot.pages["data/catalog.json"]) {
    throw new Error("candidate changed catalog bytes");
  }
  if (!pages["en/index.html"].includes('id="start"')) throw new Error("rail missing");
  if (!pages["zh/index.html"].includes("先从这几款里挑一款")) throw new Error("zh rail missing");
  const changed = Object.keys(pages).filter((key) => pages[key] !== snapshot.pages[key]).sort();
  return { pages, picks, changed, gzip: repack(pages) };
}

function main() {
  const out = arg("--out");
  const candidate = buildCandidate();
  const summary = {
    picks: candidate.picks.map((pick) => pick.slot + ":" + pick.game.slug),
    changed: candidate.changed,
    gzipBytes: candidate.gzip.length,
  };
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "pages.json.gz"), candidate.gzip);
    fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  }
  console.log(JSON.stringify(summary));
}

if (require.main === module) main();

module.exports = { buildCandidate };
