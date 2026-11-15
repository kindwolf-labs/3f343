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
const { CARDS, patchTopic, verifyTopicRules } = require("../site/browser-topic.cjs");
const { patchDetail, patchHomepage, selectStartHere } = require("../site/start-here.cjs");
const { loadSnapshot, repack, sha256, verifySnapshot } = require("./production-pack.cjs");

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
  const topicKey = "en/games/browser-ai-games/index.html";
  const rules = verifyTopicRules(CARDS, catalog, { manifest: snapshot.manifest });
  pages[topicKey] = patchTopic(pages[topicKey], CARDS);
  const zhTopic = "zh/games/browser-ai-games/index.html";
  if (pages[zhTopic] !== snapshot.pages[zhTopic]) throw new Error("refusing to add a second topic locale");
  const fableKey = "en/games/fable-52-mid-november-2026/index.html";
  if (pages[fableKey] !== snapshot.pages[fableKey]) throw new Error("candidate changed the fable page");
  if (!pages["en/index.html"].includes('id="start"')) throw new Error("rail missing");
  if (!pages["zh/index.html"].includes("先从这几款里挑一款")) throw new Error("zh rail missing");
  if (!pages["en/index.html"].includes('href="/en/games/browser-ai-games/"')) throw new Error("en topic link missing");
  if (!pages["zh/index.html"].includes('href="/en/games/browser-ai-games/"')) throw new Error("zh topic link missing");
  const changed = Object.keys(pages).filter((key) => pages[key] !== snapshot.pages[key]).sort();
  const diff = changed.map((key) => ({
    path: key,
    beforeBytes: Buffer.byteLength(snapshot.pages[key]),
    afterBytes: Buffer.byteLength(pages[key]),
    beforeSha256: sha256(Buffer.from(snapshot.pages[key], "utf8")),
    afterSha256: sha256(Buffer.from(pages[key], "utf8")),
  }));
  return { pages, picks, changed, diff, rules, gzip: repack(pages) };
}

function main() {
  const out = arg("--out");
  const candidate = buildCandidate();
  const summary = {
    production: false,
    picks: candidate.picks.map((pick) => pick.slot + ":" + pick.game.slug),
    changed: candidate.changed,
    rules: candidate.rules,
    gzipBytes: candidate.gzip.length,
    gzipSha256: sha256(candidate.gzip),
  };
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "pages.json.gz"), candidate.gzip);
    fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    fs.writeFileSync(path.join(out, "diff.json"), JSON.stringify(candidate.diff, null, 2) + "\n");
    fs.writeFileSync(path.join(out, "topic-verification.json"), JSON.stringify(candidate.rules, null, 2) + "\n");
    for (const key of candidate.changed) {
      const file = path.join(out, "pages", key);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, candidate.pages[key]);
    }
  }
  console.log(JSON.stringify(summary));
}

if (require.main === module) main();

module.exports = { buildCandidate };
