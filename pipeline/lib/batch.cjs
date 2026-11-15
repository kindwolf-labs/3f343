"use strict";

/**
 * Offline editorial batch. It does not fetch, call a model, or publish.
 * Evidence timestamps are copied from the input records. They are not stamped
 * with the time this process runs.
 */

const ALLOWED_ROLES = new Set(["authoring_credit", "unknown"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

function canonicalUrl(raw) {
  if (!raw) return "";
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function hasMarkup(value) {
  return /[<>]/.test(String(value || ""));
}

function classifyHttp(check) {
  if (!check || check.status == null) {
    return { state: "not_checked", playtestedAt: null, meaning: "" };
  }
  const html = /html/i.test(String(check.contentType || ""));
  let state = "unknown_network";
  if (check.status >= 200 && check.status < 300 && html) state = "endpoint_reachable";
  else if (check.status === 404 || check.status === 410) state = "suspect_missing";
  else if (check.status === 403 || check.status === 429) state = "blocked_or_challenge";
  else if (check.status === 405) state = "method_not_allowed";
  return {
    state,
    playtestedAt: null,
    meaning: state === "endpoint_reachable" ? "HTTP response is not a playtest" : "",
  };
}

function catalogHold(catalog, expected = { count: 1321, updatedOn: "2026-11-14", min: 1, max: 1321 }) {
  const games = (catalog && catalog.games) || [];
  const ids = games.map((game) => Number(game.id)).filter((id) => Number.isInteger(id));
  const set = new Set(ids);
  const missing = [];
  for (let id = expected.min; id <= expected.max; id += 1) {
    if (!set.has(id)) missing.push(id);
  }
  const updatedOn = catalog && (catalog.updatedOn || catalog.catalog_updated);
  const ok = games.length === expected.count
    && updatedOn === expected.updatedOn
    && missing.length === 0
    && ids.length === expected.count;
  return {
    ok,
    count: games.length,
    updatedOn: updatedOn || null,
    missing: missing.slice(0, 12),
  };
}

function qaErrors(record, game) {
  const errors = [];
  if (!game) errors.push("not_in_catalog");
  if (game && game.demo !== record.demoUrl) errors.push("demo_mismatch");
  if (game && game.slug !== record.slug) errors.push("slug_mismatch");
  if (record.playtestedAt) errors.push("playtest_claimed");
  const urlCheckedAt = record.urlCheckedAt || (record.urlCheck && record.urlCheck.checkedAt) || null;
  if (record.sourceCheckedAt && urlCheckedAt && record.sourceCheckedAt === urlCheckedAt) {
    errors.push("timestamps_not_separate");
  }
  if (!record.sourceCheckedAt) errors.push("source_unchecked");
  if (!ALLOWED_ROLES.has(record.aiRole)) errors.push("ai_role_refused");
  if (record.aiRole === "authoring_credit" && !record.aiRoleEvidence) errors.push("ai_evidence_missing");
  if (/llm/i.test(String(record.aiRoleEvidence || "")) && /is an llm|runtime llm/i.test(String(record.aiRoleEvidence || ""))) {
    errors.push("llm_claim_refused");
  }
  for (const field of ["name", "aiRoleEvidence"]) {
    if (hasMarkup(record[field])) errors.push("markup_rejected");
  }
  const http = classifyHttp(record.urlCheck);
  if (http.state === "endpoint_reachable" && record.playtestedAt) errors.push("http_treated_as_playtest");
  return errors;
}

function normalizeEvidence(records) {
  const groups = new Map();
  const rejected = [];
  for (const record of records || []) {
    if (!record || !Number.isInteger(Number(record.catalogId))) {
      rejected.push({ reason: "missing_catalog_id", name: record && record.name });
      continue;
    }
    const id = Number(record.catalogId);
    const key = "catalog:" + id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const duplicates = [];
  const normalized = [];
  for (const [key, group] of groups) {
    const ordered = [...group].sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.demoUrl).localeCompare(String(b.demoUrl)));
    if (ordered.length > 1) {
      duplicates.push({
        stableId: key,
        kept: ordered[0].slug,
        dropped: ordered.slice(1).map((row) => row.slug || row.name),
      });
    }
    const row = ordered[0];
    const http = classifyHttp(row.urlCheck);
    normalized.push(stable({
      stableId: key,
      catalogId: Number(row.catalogId),
      slug: row.slug,
      name: row.name,
      demoUrl: row.demoUrl,
      demoKey: canonicalUrl(row.demoUrl),
      sourceUrl: row.sourceUrl || "",
      sourceKey: canonicalUrl(row.sourceUrl),
      sourceCheckedAt: row.sourceCheckedAt || null,
      urlCheckedAt: (row.urlCheck && row.urlCheck.checkedAt) || null,
      urlState: http.state,
      urlMeaning: http.meaning,
      playtestedAt: row.playtestedAt || null,
      aiRole: row.aiRole || "unknown",
      aiRoleEvidence: row.aiRoleEvidence || "",
      openQuestions: [...(row.openQuestions || [])].sort(),
    }));
  }
  normalized.sort((a, b) => a.catalogId - b.catalogId);
  duplicates.sort((a, b) => a.stableId.localeCompare(b.stableId));
  const conflicts = [];
  const byDemo = new Map();
  for (const row of normalized) {
    if (!row.demoKey) continue;
    if (!byDemo.has(row.demoKey)) byDemo.set(row.demoKey, []);
    byDemo.get(row.demoKey).push(row.stableId);
  }
  for (const [demoKey, ids] of byDemo) {
    if (ids.length > 1) conflicts.push({ demoKey, stableIds: [...ids].sort() });
  }
  conflicts.sort((a, b) => a.demoKey.localeCompare(b.demoKey));
  const conflictIds = new Set(conflicts.flatMap((row) => row.stableIds));
  return { normalized, duplicates, conflicts, conflictIds, rejected };
}

function buildQueue(catalog, normalized) {
  const byId = new Map(normalized.map((row) => [row.catalogId, row]));
  const queue = [];
  for (const game of catalog.games || []) {
    const evidence = byId.get(Number(game.id));
    if (evidence) {
      queue.push({
        catalogId: Number(game.id),
        slug: game.slug,
        queueState: "evidence_on_file",
        sourceCheckedAt: evidence.sourceCheckedAt,
        urlCheckedAt: evidence.urlCheckedAt,
        urlState: evidence.urlState,
        playtestedAt: evidence.playtestedAt,
        aiRole: evidence.aiRole,
      });
    } else {
      queue.push({
        catalogId: Number(game.id),
        slug: game.slug,
        queueState: "not_checked",
        sourceCheckedAt: null,
        urlCheckedAt: null,
        urlState: "not_checked",
        playtestedAt: null,
        aiRole: "not_checked",
        reason: game.demo ? "catalog lists a demo; no evidence record" : "no evidence record",
      });
    }
  }
  queue.sort((a, b) => a.catalogId - b.catalogId);
  return queue;
}

function gate({ hold, approval, publishable }) {
  if (!hold.ok) {
    return { approved: false, blocked: "catalog_regression", entries: [], catalogHold: hold };
  }
  if (approval && Array.isArray(approval.deletions) && approval.deletions.length) {
    return { approved: false, blocked: "catalog_deletion_refused", entries: [], catalogHold: hold };
  }
  if (!approval || !approval.approver || !Array.isArray(approval.catalogIds) || !approval.catalogIds.length) {
    return { approved: false, blocked: "approval_required", entries: [], catalogHold: hold };
  }
  const wanted = new Set(approval.catalogIds.map(Number));
  const entries = publishable.filter((row) => wanted.has(row.catalogId));
  const skipped = [...wanted].filter((id) => !entries.some((row) => row.catalogId === id)).sort((a, b) => a - b);
  return {
    approved: true,
    blocked: null,
    approver: approval.approver,
    entries,
    skipped,
    catalogHold: hold,
    note: "Approved diff is a review artifact. It does not write production.",
  };
}

function runBatch({ catalog, evidence, approval }) {
  const records = (evidence && evidence.records) || [];
  const norm = normalizeEvidence(records);
  const games = new Map((catalog.games || []).map((game) => [Number(game.id), game]));
  const audit = [];
  const publishable = [];
  for (const row of norm.normalized) {
    const errors = qaErrors(row, games.get(row.catalogId));
    if (norm.conflictIds.has(row.stableId)) errors.push("url_conflict");
    const http = classifyHttp({ status: row.urlState === "endpoint_reachable" ? 200 : 0, contentType: "text/html" });
    if (row.urlState === "endpoint_reachable" && row.playtestedAt) errors.push("http_treated_as_playtest");
    if (row.urlState === "endpoint_reachable" && http.meaning && row.playtestedAt !== null) errors.push("http_treated_as_playtest");
    audit.push({ stableId: row.stableId, catalogId: row.catalogId, errors });
    if (!errors.length) publishable.push(row);
  }
  const hold = catalogHold(catalog);
  const queue = buildQueue(catalog, norm.normalized);
  const withEvidence = queue.filter((row) => row.queueState === "evidence_on_file").length;
  const publication = gate({ hold, approval, publishable });
  const qa = {
    ok: audit.every((row) => row.errors.length === 0) && norm.rejected.length === 0 && hold.ok,
    evidenceRecords: records.length,
    normalized: norm.normalized.length,
    duplicates: norm.duplicates.length,
    conflicts: norm.conflicts.length,
    rejected: norm.rejected.length,
    publishable: publishable.length,
    catalogHold: hold,
  };
  return stable({
    duplicates: norm.duplicates,
    conflicts: norm.conflicts,
    rejected: norm.rejected,
    normalized: norm.normalized,
    audit,
    queue,
    queueSummary: {
      catalogCount: queue.length,
      withEvidence,
      notChecked: queue.length - withEvidence,
      wholeCatalogReviewed: false,
    },
    qa,
    publication,
    releaseAudit: {
      pipeline: "wp4-offline-v1",
      writesProduction: false,
      network: false,
      llm: false,
      scheduler: false,
      evidenceRecords: records.length,
      catalogCount: queue.length,
    },
  });
}

module.exports = {
  catalogHold,
  canonicalUrl,
  classifyHttp,
  gate,
  normalizeEvidence,
  runBatch,
  stable,
};
