"use strict";

/**
 * Six-card replacement for the existing /en/games/browser-ai-games/ page.
 * Facts come from site/browser-topic-cards.json. Source check, URL check,
 * and playtest stay separate fields. This module does not publish.
 */

const fs = require("fs");
const path = require("path");

const CARDS = JSON.parse(fs.readFileSync(path.join(__dirname, "browser-topic-cards.json"), "utf8"));

const FORBIDDEN = [
  [/\bfree\b/i, "free"],
  [/免费/, "免费"],
  [/\bLLM\b/, "LLM"],
  [/手机/, "手机"],
  [/\bphones?\b/i, "phone"],
  [/\bmobile\b/i, "mobile"],
  [/可玩/, "可玩"],
  [/\bplayable\b/i, "playable"],
  [/\bplaytested\b/i, "playtested"],
];

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardText(card) {
  return [card.gameplay, card.fit, card.notFit, card.barrier, card.authorshipNote, card.name].join("\n");
}

function verifyTopicRules(doc, catalog, options = {}) {
  const errors = [];
  if (!doc || doc.page !== "en/games/browser-ai-games/index.html") errors.push("topic page path changed");
  if (doc.ranking !== false) errors.push("cards are not a ranking");
  if (doc.playtestedAt !== null) errors.push("playtestedAt must stay empty");
  if (doc.catalogUpdated !== "2026-11-14" || doc.catalogCount !== 1321) errors.push("catalog anchor changed");
  if (!doc.sourceCheckedAt || doc.sourceCheckedAt === doc.urlCheckedAt) errors.push("source and url checks must be separate");
  const cards = doc.cards || [];
  if (cards.length < 3 || cards.length > 6) errors.push("card count " + cards.length);
  const games = new Map((catalog.games || []).map((game) => [game.slug, game]));
  const seen = new Set();
  cards.forEach((card, index) => {
    if (seen.has(card.slug)) errors.push("duplicate " + card.slug);
    seen.add(card.slug);
    const game = games.get(card.slug);
    if (!game) errors.push("missing catalog game " + card.slug);
    else {
      if (Number(game.id) !== card.catalogId) errors.push("id mismatch " + card.slug);
      if (game.addedOn !== card.addedOn) errors.push("date mismatch " + card.slug);
      if (game.demo !== card.demoUrl) errors.push("demo mismatch " + card.slug);
      if (game.name !== card.name) errors.push("name mismatch " + card.slug);
      const imageName = String(game.image || "").split("/").pop();
      if (imageName !== card.image.split("/").pop()) errors.push("image mismatch " + card.slug);
    }
    for (const field of ["gameplay", "fit", "notFit", "barrier", "authorshipNote"]) {
      if (!String(card[field] || "").trim()) errors.push(card.slug + " missing " + field);
    }
    if (!card.urlCheck || card.urlCheck.checkedAt !== doc.urlCheckedAt) errors.push("url check split " + card.slug);
    if (card.urlCheck.finalUrl !== card.demoUrl) errors.push("final url differs " + card.slug);
    if (card.urlCheck.meaning !== "HTTP response is not a playtest") errors.push("url meaning " + card.slug);
    if (!Number.isInteger(card.urlCheck.status)) errors.push("url status " + card.slug);
    const text = cardText(card);
    for (const [pattern, label] of FORBIDDEN) {
      if (pattern.test(text)) errors.push(card.slug + " contains " + label);
    }
    const duration = /\b(?:minutes?|hours?)\b|分钟|小时/.test(text);
    if (duration && card.slug !== "mirage-1301") errors.push(card.slug + " invents a duration");
    if (card.slug === "mirage-1301" && !/catalog/i.test(text)) errors.push("mirage duration is not labeled as catalog text");
    if (options.manifest) {
      const meta = options.manifest.files && options.manifest.files[card.image.replace(/^\//, "")];
      if (!meta) errors.push("manifest missing " + card.image);
    }
    if (index > 6) errors.push("extra card");
  });
  if (errors.length) {
    const error = new Error(errors.join("\n"));
    error.errors = errors;
    throw error;
  }
  return {
    ok: true,
    cards: cards.length,
    slugs: cards.map((card) => card.slug),
    sourceCheckedAt: doc.sourceCheckedAt,
    urlCheckedAt: doc.urlCheckedAt,
    playtestedAt: doc.playtestedAt,
  };
}

function renderCard(card, sourceCheckedAt) {
  const page = `/en/games/${card.slug}/`;
  const check = card.urlCheck;
  return `<article class="topic-card" id="${esc(card.slug)}" data-catalog-id="${esc(card.catalogId)}"><a class="topic-shot" href="${esc(page)}"><img src="${esc(card.image)}" alt="${esc(card.name)}"></a><div class="topic-copy"><p class="topic-kicker">Catalog ${esc(card.addedOn)} · id ${esc(card.catalogId)}</p><h2><a href="${esc(page)}">${esc(card.name)}</a></h2><p><strong>Gameplay.</strong> ${esc(card.gameplay)}</p><p><strong>For.</strong> ${esc(card.fit)}</p><p><strong>May not fit.</strong> ${esc(card.notFit)}</p><p><strong>Known barrier.</strong> ${esc(card.barrier)}</p><p class="topic-note">${esc(card.authorshipNote)}</p><dl class="checks"><dt>Source check</dt><dd data-source-checked="${esc(sourceCheckedAt)}">Catalog text read ${esc(sourceCheckedAt)}. Repository files were not re-read.</dd><dt>URL check</dt><dd data-url-checked="${esc(check.checkedAt)}">HTTP ${esc(check.status)}, ${esc(check.contentType)}, ${esc(check.checkedAt)}. A response is not a playtest.</dd><dt>Playtest</dt><dd data-playtested="">Not done.</dd></dl><p class="topic-links"><a href="${esc(page)}">Catalog entry</a> · <a href="${esc(card.demoUrl)}" target="_blank" rel="noopener">Catalog demo URL</a></p></div></article>`;
}

function renderTopic(doc = CARDS, options = {}) {
  const insights = options.insights
    ? `<script defer src="/_vercel/insights/script.js"></script>`
    : "";
  const description =
    "Six cataloged browser games. Source check, URL check, and playtest are separate. An HTTP response is not a playtest.";
  const items = doc.cards
    .map(
      (card, index) =>
        `{"@type":"ListItem","position":${index + 1},"name":${JSON.stringify(card.name)},"url":"https://3f343.com/en/games/${card.slug}/"}`,
    )
    .join(",");
  const jsonLd = `{"@context":"https://schema.org","@type":"CollectionPage","name":"Browser AI games","url":"${doc.canonical}","description":${JSON.stringify(description)},"isPartOf":{"@type":"WebSite","name":"AI Game Radar","url":"https://3f343.com/en/"},"mainEntity":{"@type":"ItemList","name":"Browser AI games","itemListOrder":"Unordered","numberOfItems":${doc.cards.length},"itemListElement":[${items}]}}`;
  const record = JSON.stringify({
    page: doc.page,
    catalogUpdated: doc.catalogUpdated,
    catalogCount: doc.catalogCount,
    ranking: false,
    sourceCheckedAt: doc.sourceCheckedAt,
    urlCheckedAt: doc.urlCheckedAt,
    playtestedAt: null,
    slugs: doc.cards.map((card) => card.slug),
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Browser AI games | AI Game Radar</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(doc.canonical)}"><link rel="alternate" hreflang="en" href="${esc(doc.canonical)}"><link rel="alternate" hreflang="x-default" href="${esc(doc.canonical)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:title" content="Browser AI games | AI Game Radar"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(doc.canonical)}"><meta property="og:image" content="https://3f343.com/assets/outpace.png">${insights}<style>body{margin:0;background:#090b10;color:#f4f2ee;font:16px/1.45 system-ui}main{max-width:1080px;margin:auto;padding:20px 16px 64px}a{color:#efb767}h1{margin:8px 0;font-size:clamp(32px,5vw,48px);line-height:1.05;letter-spacing:-.04em}.lead,.aside{color:#d7c49a}.topic-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:16px}.topic-card{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;background:#141923;border:1px solid #293340;border-radius:14px;overflow:hidden}.topic-shot img{display:block;width:100%;height:168px;object-fit:cover;background:#263348}.topic-copy{padding:0 12px 12px}.topic-kicker{margin:0;color:#efb767;font-size:12px;font-weight:700}.topic-copy h2{margin:2px 0 8px;font-size:24px;line-height:1.15}.topic-copy p{margin:0 0 8px}.topic-note{color:#bfc8d3;font-size:14px}.checks{display:grid;grid-template-columns:7.2rem minmax(0,1fr);gap:4px 8px;margin:0 0 8px;font-size:13px}.checks dt{color:#efb767}.checks dd{margin:0}.topic-links{font-size:14px}@media(min-width:800px){.topic-grid{grid-template-columns:1fr 1fr}.topic-shot img{height:180px}}</style><script type="application/ld+json">${jsonLd}</script></head><body><main><p><a href="/en/">3F343</a> · <a href="/zh/">中文首页</a></p><h1>Browser AI games</h1><p class="lead">Six catalog entries that already have a browser demo URL. The order is the evidence list, not a ranking. The full catalog stays on the homepage. Catalog date ${esc(doc.catalogUpdated)}. Count ${esc(doc.catalogCount)}.</p><p class="aside">Source check, URL check, and playtest are three different records. Opening a demo URL and receiving a page does not mean this site played the game.</p><p class="aside">A separate 2026-11-15 note on Fable 5.2 titles, including pages that were not added to the catalog, stays at <a href="/en/games/fable-52-mid-november-2026/">Fable 5.2 games, mid-November 2026</a>. That page is not a catalog update.</p><div id="topic-cards" class="topic-grid">${doc.cards.map((card) => renderCard(card, doc.sourceCheckedAt)).join("")}</div><p><a href="/en/">Back to the catalog</a></p></main><script type="application/json" id="topic-rule-record">${record}</script></body></html>`;
}

function patchTopic(html, doc = CARDS) {
  if (String(html || "").includes('id="topic-cards"')) return html;
  return renderTopic(doc, { insights: String(html || "").includes("/_vercel/insights/script.js") });
}

module.exports = {
  CARDS,
  FORBIDDEN,
  patchTopic,
  renderTopic,
  verifyTopicRules,
};
