#!/usr/bin/env node
"use strict";

/**
 * Offline WP4 batch. Reads the pinned catalog and pipeline/inputs/evidence-six.json.
 * It does not fetch, schedule, or deploy.
 *
 *   node pipeline/run.cjs
 *   node pipeline/run.cjs --approve approval.json --out /tmp/wp4-approved
 */

const fs = require("fs");
const path = require("path");
const { loadSnapshot } = require("../scripts/production-pack.cjs");
const { runBatch, stable } = require("./lib/batch.cjs");

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(stable(value), null, 2) + "\n");
}

function main() {
  const snapshot = loadSnapshot();
  const catalog = JSON.parse(snapshot.pages["data/catalog.json"]);
  const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, "inputs", "evidence-six.json"), "utf8"));
  const approvalPath = arg("--approve");
  const approval = approvalPath ? JSON.parse(fs.readFileSync(approvalPath, "utf8")) : null;
  const batch = runBatch({ catalog, evidence, approval });
  const out = path.resolve(arg("--out") || path.join(__dirname, "output"));
  writeJson(path.join(out, "normalized_candidates.json"), batch.normalized);
  writeJson(path.join(out, "audit_records.json"), batch.audit);
  writeJson(path.join(out, "editorial_queue.json"), { summary: batch.queueSummary, items: batch.queue });
  writeJson(path.join(out, "qa_report.json"), batch.qa);
  writeJson(path.join(out, "publication_diff.json"), batch.publication);
  writeJson(path.join(out, "release_audit.json"), batch.releaseAudit);
  console.log(JSON.stringify({
    out,
    catalogCount: batch.queueSummary.catalogCount,
    withEvidence: batch.queueSummary.withEvidence,
    notChecked: batch.queueSummary.notChecked,
    wholeCatalogReviewed: false,
    publicationBlocked: batch.publication.blocked,
    publicationEntries: batch.publication.entries.length,
    writesProduction: false,
  }));
}

if (require.main === module) main();

module.exports = { main };
