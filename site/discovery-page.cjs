"use strict";

const { sentence } = require("./homepage-refresh.cjs");

// Public 3f343.com is fronted by edge rewrites. The only bilingual HTML
// rewrite is ^/(zh|en)/games/([^/]+)/?$ to this project. A page outside
// that pattern 404s on the custom domain even when this deployment has it.
const PAGE_PATH = "/en/games/browser-ai-games/";
const PAGE_URL = "https://3f343.com/en/games/browser-ai-games/";

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function browserEntries(catalog) {
  const games = (catalog.games || [])
    .filter((game) => game.demo && (game.accessType === "browser" || (game.tech || []).includes("Browser")))
    .sort((a, b) => String(b.addedOn || "").localeCompare(String(a.addedOn || "")) || Number(b.id) - Number(a.id));
  const dates = [];
  for (const game of games) {
    if (game.addedOn && !dates.includes(game.addedOn)) dates.push(game.addedOn);
    if (dates.length === 3) break;
  }
  return games.filter((game) => dates.includes(game.addedOn));
}

function renderDiscoveryPage(catalog) {
  const updated = catalog.updatedOn || catalog.catalog_updated || "";
  const entries = browserEntries(catalog);
  const byDate = new Map();
  for (const game of entries) {
    if (!byDate.has(game.addedOn)) byDate.set(game.addedOn, []);
    byDate.get(game.addedOn).push(game);
  }
  const sections = [...byDate.entries()]
    .map(([date, games]) => {
      const cards = games
        .map((game) => {
          const neighbors = games.filter((other) => other.slug !== game.slug).slice(0, 3);
          const related = neighbors
            .map((other) => `<a href="/en/games/${escapeAttr(other.slug)}/">${escapeText(other.name)}</a>`)
            .join(" · ");
          const blurb = sentence(game.description);
          return `<article class="card" id="${escapeAttr(game.slug)}"><h3><a href="/en/games/${escapeAttr(game.slug)}/">${escapeText(game.name)}</a></h3>${blurb ? `<p>${escapeText(blurb)}</p>` : ""}<p class="links"><a href="/en/games/${escapeAttr(game.slug)}/">Catalog entry</a> · <a href="${escapeAttr(game.demo)}">Listed demo</a>${game.github ? ` · <a href="${escapeAttr(game.github)}">Source</a>` : ""}</p>${related ? `<p class="related">Also cataloged ${escapeText(date)}: ${related}</p>` : ""}</article>`;
        })
        .join("");
      return `<section><h2>Cataloged ${escapeText(date)}</h2><p>${games.length} catalog ${games.length === 1 ? "entry" : "entries"} with a browser demo URL.</p>${cards}</section>`;
    })
    .join("");
  const itemList = entries.map((game, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: game.name,
    url: `https://3f343.com/en/games/${game.slug}/`,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browser demo links in the AI game catalog",
    url: PAGE_URL,
    isPartOf: { "@type": "WebSite", name: "AI Game Radar", url: "https://3f343.com/en/" },
    description:
      "Catalog entries that include a browser demo URL. A listed demo is not a completed playtest.",
    mainEntity: {
      "@type": "ItemList",
      name: "Recent browser demo links",
      itemListElement: itemList,
    },
  };
  const title = "Browser demo links | AI Game Radar";
  const description =
    "Recent 3F343 catalog entries that list a browser demo URL, with links to each catalog page, the stored demo URL, and the source repository. A listed demo is not a completed playtest.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${escapeAttr(description)}"><link rel="canonical" href="${PAGE_URL}"><link rel="alternate" hreflang="en" href="${PAGE_URL}"><link rel="alternate" hreflang="x-default" href="${PAGE_URL}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeAttr(description)}"><meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="https://3f343.com/assets/outpace.png"><script defer src="/_vercel/insights/script.js"></script><style>body{margin:0;background:#090b10;color:#f4f2ee;font:16px/1.65 system-ui}main{max-width:900px;margin:auto;padding:28px 20px 64px}a{color:#efb767}h1{font-size:clamp(32px,5vw,52px);line-height:1.05;letter-spacing:-.04em}h2{margin-top:36px}.card{border-top:1px solid #293340;padding:16px 0}.links,.related{font-size:14px}.note{color:#bfc8d3}</style><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script></head><body><main><p><a href="/en/">3F343</a> · <a href="/zh/">中文首页</a></p><h1>Browser demo links</h1><p class="note">These are catalog entries dated through ${escapeText(updated)} that store a browser demo URL. “Listed demo” means that URL is in the catalog. It does not mean 3F343 completed a playtest. Descriptions below are the catalog text.</p>${sections}<p><a href="/en/">Back to the catalog</a></p></main></body></html>`;
}

module.exports = {
  PAGE_PATH,
  PAGE_URL,
  browserEntries,
  renderDiscoveryPage,
};
