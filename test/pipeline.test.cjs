"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { loadSnapshot } = require("../scripts/production-pack.cjs");
const { CARDS } = require("../site/browser-topic.cjs");
const {
  catalogHold,
  canonicalUrl,
  classifyHttp,
  gate,
  normalizeEvidence,
  runBatch,
} = require("../pipeline/lib/batch.cjs");

const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, "../pipeline/inputs/evidence-six.json"), "utf8"));

function realCatalog() {
  return JSON.parse(loadSnapshot().pages["data/catalog.json"]);
}

test("the six evidence rows match the catalog and are not the whole review", () => {
  const catalog = realCatalog();
  const first = runBatch({ catalog, evidence, approval: null });
  const second = runBatch({ catalog, evidence, approval: null });
  assert.deepEqual(first, second);
  assert.equal(first.normalized.length, 6);
  assert.equal(first.queueSummary.catalogCount, 1321);
  assert.equal(first.queueSummary.withEvidence, 6);
  assert.equal(first.queueSummary.notChecked, 1315);
  assert.equal(first.queueSummary.wholeCatalogReviewed, false);
  assert.equal(first.publication.blocked, "approval_required");
  assert.equal(first.publication.entries.length, 0);
  assert.equal(first.releaseAudit.writesProduction, false);
  assert.equal(first.releaseAudit.network, false);
  assert.equal(first.releaseAudit.llm, false);
  const unchecked = first.queue.find((row) => row.queueState === "not_checked");
  assert.equal(unchecked.sourceCheckedAt, null);
  assert.equal(unchecked.urlCheckedAt, null);
  assert.equal(unchecked.urlState, "not_checked");
  assert.equal(unchecked.playtestedAt, null);
  for (const row of first.normalized) {
    assert.equal(row.urlState, "endpoint_reachable");
    assert.equal(row.playtestedAt, null);
    assert.notEqual(row.sourceCheckedAt, row.urlCheckedAt);
    assert.equal(row.aiRole, "authoring_credit");
  }
  assert.deepEqual(
    first.normalized.map((row) => row.slug),
    [...CARDS.cards].map((card) => card.slug).sort((a, b) => {
      const id = (slug) => CARDS.cards.find((card) => card.slug === slug).catalogId;
      return id(a) - id(b);
    }),
  );
});

test("duplicates collapse, conflicting URLs stay out, and markup is refused", () => {
  const pulp = evidence.records[0];
  const copy = { ...pulp, name: "Pulp Panic copy", slug: "pulp-panic-copy" };
  const other = { ...evidence.records[1], catalogId: 50, slug: "other", demoUrl: pulp.demoUrl, name: "Other" };
  const marked = { ...evidence.records[2], catalogId: 60, slug: "marked", name: "<script>" };
  const norm = normalizeEvidence([pulp, copy, other, marked]);
  assert.equal(norm.duplicates.length, 1);
  assert.equal(norm.duplicates[0].stableId, "catalog:1320");
  assert.equal(norm.normalized.filter((row) => row.catalogId === 1320).length, 1);
  assert.equal(norm.conflicts.length, 1);
  const catalog = {
    updatedOn: "2026-11-14",
    games: [
      { id: 1320, slug: pulp.slug, demo: pulp.demoUrl },
      { id: 50, slug: "other", demo: pulp.demoUrl },
      { id: 60, slug: "marked", demo: "https://example.com/marked" },
    ],
  };
  const batch = runBatch({
    catalog: { ...catalog, games: catalog.games.concat(unusedGames()) },
    evidence: { records: [pulp, copy, other, marked] },
    approval: { approver: "fixture", catalogIds: [1320, 50, 60] },
  });
  assert.equal(batch.publication.entries.some((row) => row.catalogId === 50), false);
  assert.equal(batch.publication.entries.some((row) => row.catalogId === 60), false);
});

test("HTTP 200 is reachable and is not a playtest", () => {
  const reach = classifyHttp({ status: 200, contentType: "text/html" });
  assert.equal(reach.state, "endpoint_reachable");
  assert.equal(reach.playtestedAt, null);
  assert.match(reach.meaning, /not a playtest/);
  assert.equal(classifyHttp({ status: 404, contentType: "text/html" }).state, "suspect_missing");
  assert.equal(classifyHttp({ status: 403, contentType: "text/html" }).state, "blocked_or_challenge");
  assert.equal(classifyHttp({ status: 429, contentType: "text/html" }).state, "blocked_or_challenge");
  assert.equal(classifyHttp({ status: 405, contentType: "text/html" }).state, "method_not_allowed");
  assert.equal(classifyHttp(null).state, "not_checked");
  const claimed = {
    ...evidence.records[0],
    playtestedAt: "2026-11-15T15:49:33Z",
  };
  const batch = runBatch({
    catalog: padded([{ id: 1320, slug: claimed.slug, demo: claimed.demoUrl }]),
    evidence: { records: [claimed] },
    approval: { approver: "fixture", catalogIds: [1320] },
  });
  assert.equal(batch.publication.entries.length, 0);
  assert.equal(batch.audit[0].errors.includes("playtest_claimed"), true);
});

test("no approval and catalog deletion cannot enter the publication diff", () => {
  const hold = { ok: true, count: 1321, updatedOn: "2026-11-14", missing: [] };
  const publishable = [{ catalogId: 1320, slug: "pulp-panic-1320" }];
  const blocked = gate({ hold, approval: null, publishable });
  assert.equal(blocked.blocked, "approval_required");
  assert.equal(blocked.entries.length, 0);
  const deleted = gate({ hold, approval: { approver: "fixture", catalogIds: [1320], deletions: [1] }, publishable });
  assert.equal(deleted.blocked, "catalog_deletion_refused");
  assert.equal(deleted.entries.length, 0);
  const regressed = catalogHold({ updatedOn: "2026-11-13", games: realCatalog().games });
  assert.equal(regressed.ok, false);
  const missing = catalogHold({ updatedOn: "2026-11-14", games: realCatalog().games.filter((game) => game.id !== 1) });
  assert.equal(missing.ok, false);
  assert.equal(missing.missing.includes(1), true);
});

test("an explicit approval still does not rewrite the catalog", () => {
  const catalog = realCatalog();
  const before = JSON.stringify(catalog);
  const batch = runBatch({
    catalog,
    evidence,
    approval: {
      approver: "fixture-not-a-release",
      catalogIds: evidence.records.map((row) => row.catalogId),
    },
  });
  assert.equal(JSON.stringify(catalog), before);
  assert.equal(batch.publication.approved, true);
  assert.equal(batch.publication.entries.length, 6);
  assert.equal(batch.publication.catalogHold.count, 1321);
  assert.equal(batch.releaseAudit.writesProduction, false);
  const skipped = runBatch({
    catalog,
    evidence,
    approval: { approver: "fixture-not-a-release", catalogIds: [1] },
  });
  assert.equal(skipped.publication.entries.length, 0);
  assert.deepEqual(skipped.publication.skipped, [1]);
});

test("the committed batch matches a fresh run", () => {
  const catalog = realCatalog();
  const batch = runBatch({ catalog, evidence, approval: null });
  const dir = path.join(__dirname, "../pipeline/output");
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  assert.deepEqual(read("publication_diff.json"), batch.publication);
  assert.deepEqual(read("qa_report.json"), batch.qa);
  assert.deepEqual(read("release_audit.json"), batch.releaseAudit);
  assert.deepEqual(read("normalized_candidates.json"), batch.normalized);
  assert.deepEqual(read("editorial_queue.json"), { summary: batch.queueSummary, items: batch.queue });
});

test("canonical URLs ignore a trailing slash and a private scheme", () => {
  assert.equal(canonicalUrl("https://Example.com/demo/"), "https://example.com/demo");
  assert.equal(canonicalUrl("javascript:alert(1)"), "");
});

function padded(games) {
  const catalog = realCatalog();
  const byId = new Map(catalog.games.map((game) => [game.id, game]));
  for (const game of games) byId.set(game.id, { ...byId.get(game.id), ...game });
  return { updatedOn: catalog.updatedOn, catalog_updated: catalog.catalog_updated, games: [...byId.values()] };
}

function unusedGames() {
  return realCatalog().games.filter((game) => ![1320, 50, 60].includes(game.id));
}
