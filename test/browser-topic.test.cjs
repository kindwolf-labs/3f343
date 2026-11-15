"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { CARDS, patchTopic, renderTopic, verifyTopicRules } = require("../site/browser-topic.cjs");
const { buildCandidate } = require("../scripts/pr4-candidate.cjs");
const { loadSnapshot, sha256 } = require("../scripts/production-pack.cjs");

test("topic rules stay inside the catalog and keep the three checks apart", () => {
  const snapshot = loadSnapshot();
  const catalog = JSON.parse(snapshot.pages["data/catalog.json"]);
  const rules = verifyTopicRules(CARDS, catalog, { manifest: snapshot.manifest });
  assert.equal(rules.ok, true);
  assert.equal(rules.cards, 6);
  assert.equal(rules.playtestedAt, null);
  assert.notEqual(rules.sourceCheckedAt, rules.urlCheckedAt);
  assert.deepEqual(rules.slugs, [
    "pulp-panic-1320",
    "vaquitas-de-bloque-1321",
    "balloon-stack-1311",
    "dinopixel-1310",
    "hoard-hopper-1309",
    "mirage-1301",
  ]);
});

test("the existing topic keeps its list and folds checks under the six picks", () => {
  const snapshot = loadSnapshot();
  const before = snapshot.pages["en/games/browser-ai-games/index.html"];
  const after = patchTopic(before, CARDS);
  assert.equal(patchTopic(after, CARDS), after);
  assert.equal(after.includes("/_vercel/insights/script.js"), true);
  assert.equal(after.includes('href="https://3f343.com/en/games/browser-ai-games/"'), true);
  assert.equal(after.includes("/en/games/fable-52-mid-november-2026/"), true);
  assert.equal(after.indexOf('id="topic-cards"') < after.indexOf('id="more-browser-games"'), true);
  assert.equal((after.match(/class="topic-card"/g) || []).length, 6);
  assert.equal((after.match(/<details class="sources">/g) || []).length, 6);
  assert.equal(after.includes("<details class=\"sources\" open"), false);
  assert.equal((after.match(/data-source-checked=/g) || []).length, 6);
  assert.equal((after.match(/data-url-checked=/g) || []).length, 6);
  assert.equal((after.match(/data-playtested=""/g) || []).length, 6);
  assert.equal(after.includes("A response is not a playtest."), true);
  assert.equal(after.includes("Playtest: Not done."), true);
  assert.equal(after.includes("as the catalog describes"), false);
  assert.equal(after.includes("not tested"), false);
  const ids = [...before.matchAll(/<article class="card" id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 25);
  for (const id of ids) assert.equal(after.includes(`id="${id}"`), true, id);
  const picks = after.slice(after.indexOf('id="topic-cards"'), after.indexOf('id="more-browser-games"'));
  assert.equal(/\bfree\b|免费|\bLLM\b|手机|\bphones?\b|\bmobile\b|可玩|\bplayable\b/i.test(picks), false);
  assert.equal(after.includes("zh/games/browser-ai-games"), false);
  const record = JSON.parse(after.match(/<script type="application\/json" id="topic-rule-record">([\s\S]*?)<\/script>/)[1]);
  assert.equal(record.playtestedAt, null);
  assert.equal(record.catalogCount, 1321);
  assert.equal(record.ranking, false);
  const mirage = after.slice(after.indexOf('id="pick-mirage-1301"'), after.indexOf("</article>", after.indexOf('id="pick-mirage-1301"')));
  const face = mirage.slice(0, mirage.indexOf("<details"));
  assert.match(mirage, /catalog/i);
  assert.match(face, /ten minutes/i);
  assert.equal(/2026-11-15T/.test(face), false);
  const vaquitas = after.slice(after.indexOf('id="pick-vaquitas-de-bloque-1321"'), after.indexOf("</article>", after.indexOf('id="pick-vaquitas-de-bloque-1321"')));
  const vaquitasFace = vaquitas.slice(0, vaquitas.indexOf("<details"));
  assert.match(vaquitasFace, /Gameplay note\./);
  assert.match(vaquitasFace, /rustlers at night/);
  assert.equal(vaquitasFace.includes("Known barrier"), false);
});

test("candidate keeps every catalog id and leaves fable, sitemap, and latest untouched", () => {
  const snapshot = loadSnapshot();
  const candidate = buildCandidate(snapshot);
  const catalog = JSON.parse(candidate.pages["data/catalog.json"]);
  const ids = catalog.games.map((game) => game.id).sort((a, b) => a - b);
  assert.equal(ids.length, 1321);
  assert.equal(ids[0], 1);
  assert.equal(ids[1320], 1321);
  for (let i = 0; i < ids.length; i += 1) assert.equal(ids[i], i + 1);
  assert.equal(catalog.updatedOn, "2026-11-14");
  for (const key of ["llms.txt", "robots.txt", "sitemap.xml", "latest/index.html", "data/catalog.json"]) {
    assert.equal(candidate.pages[key], snapshot.pages[key]);
  }
  assert.equal(candidate.pages["en/latest/index.html"], undefined);
  assert.equal(candidate.changed.length, 15);
  const topic = candidate.pages["en/games/browser-ai-games/index.html"];
  assert.notEqual(sha256(Buffer.from(topic, "utf8")), sha256(Buffer.from(snapshot.pages["en/games/browser-ai-games/index.html"], "utf8")));
  assert.equal(candidate.pages["en/index.html"].includes('href="/en/games/browser-ai-games/"'), true);
  assert.equal(candidate.pages["zh/index.html"].includes('href="/en/games/browser-ai-games/"'), true);
  const committed = path.join(__dirname, "../candidate/pages");
  for (const key of candidate.changed) {
    assert.equal(fs.readFileSync(path.join(committed, key), "utf8"), candidate.pages[key], key);
  }
});
