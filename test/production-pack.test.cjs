"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildCandidate } = require("../scripts/pr4-candidate.cjs");
const {
  contentDigest,
  loadSnapshot,
  repack,
  sha256,
  verifySnapshot,
} = require("../scripts/production-pack.cjs");

test("the morning snapshot matches the preserved production bytes", () => {
  const first = verifySnapshot(loadSnapshot());
  const second = verifySnapshot(loadSnapshot());
  assert.equal(first.catalogCount, 1321);
  assert.equal(first.catalogUpdated, "2026-11-14");
  assert.equal(first.idMin, 1);
  assert.equal(first.idMax, 1321);
  assert.equal(first.idGaps, 0);
  assert.equal(first.staticFiles, 99);
  assert.equal(first.staticAssets, 100);
  assert.equal(first.pages, 2745);
  assert.equal(first.contentSha256, second.contentSha256);
  assert.equal(first.contentSha256, contentDigest(loadSnapshot().pages));
});

test("two repacks of the snapshot are byte-identical and keep every page", () => {
  const { pages } = loadSnapshot();
  const once = repack(pages);
  const twice = repack(pages);
  assert.equal(sha256(once), sha256(twice));
  const zlib = require("zlib");
  const restored = JSON.parse(zlib.gunzipSync(once).toString("utf8"));
  assert.equal(Object.keys(restored).length, Object.keys(pages).length);
  for (const key of Object.keys(pages)) {
    assert.equal(restored[key], pages[key]);
  }
});

test("PR4 candidate keeps the catalog and adds the rail on top of the snapshot", () => {
  const snapshot = loadSnapshot();
  const candidate = buildCandidate(snapshot);
  assert.equal(candidate.pages["data/catalog.json"], snapshot.pages["data/catalog.json"]);
  assert.ok(candidate.pages["en/index.html"].includes('id="start"'));
  assert.equal(snapshot.pages["en/index.html"].includes('id="start"'), false);
  assert.ok(candidate.changed.includes("en/index.html"));
  assert.ok(candidate.changed.includes("zh/index.html"));
  assert.equal(candidate.changed.includes("data/catalog.json"), false);
  assert.equal(candidate.changed.includes("llms.txt"), false);
  assert.equal(candidate.changed.includes("en/games/browser-ai-games/index.html"), true);
  assert.equal(candidate.changed.includes("en/games/fable-52-mid-november-2026/index.html"), false);
  assert.equal(candidate.changed.includes("zh/games/browser-ai-games/index.html"), false);
  assert.equal(candidate.pages["en/games/fable-52-mid-november-2026/index.html"], snapshot.pages["en/games/fable-52-mid-november-2026/index.html"]);
  assert.equal(candidate.rules.cards, 6);
  assert.equal(candidate.rules.playtestedAt, null);
  const again = buildCandidate(loadSnapshot());
  assert.equal(sha256(candidate.gzip), sha256(again.gzip));
  assert.equal(candidate.pages["en/games/browser-ai-games/index.html"], again.pages["en/games/browser-ai-games/index.html"]);
  const catalog = JSON.parse(candidate.pages["data/catalog.json"]);
  const ids = new Set(catalog.games.map((game) => game.id));
  for (let id = 1; id <= 1321; id += 1) assert.equal(ids.has(id), true);
});
