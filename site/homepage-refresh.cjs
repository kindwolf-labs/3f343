"use strict";

const { absolutizeOgImages } = require("./detail-page.cjs");

function formatCount(value) {
  return Number(value).toLocaleString("en-US");
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function catalogGames(catalog) {
  return Array.isArray(catalog) ? catalog : (catalog && catalog.games) || [];
}

function catalogDate(catalog) {
  return (catalog && (catalog.updatedOn || catalog.catalog_updated)) || "";
}

function countsFrom(catalog) {
  const games = catalogGames(catalog);
  const stats = (catalog && catalog.stats) || {};
  return {
    games: Number(stats.games ?? games.length),
    demos: Number(stats.demos ?? games.filter((game) => game.demo).length),
    screenshots: Number(stats.screenshots ?? games.filter((game) => game.mediaType === "gameplay").length),
    source: Number(stats.source ?? games.filter((game) => game.github).length),
    updatedOn: catalogDate(catalog),
  };
}

function newestGames(catalog, limit) {
  return catalogGames(catalog)
    .slice()
    .sort((a, b) => String(b.addedOn || "").localeCompare(String(a.addedOn || "")) || Number(b.id) - Number(a.id))
    .slice(0, limit);
}

function latestDayGames(catalog) {
  const games = catalogGames(catalog).filter((game) => game.addedOn);
  const latest = games.reduce((max, game) => (game.addedOn > max ? game.addedOn : max), "");
  return {
    date: latest,
    games: games
      .filter((game) => game.addedOn === latest)
      .sort((a, b) => Number(a.id) - Number(b.id)),
  };
}

function sentence(value) {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  text = text.replace(/^\s*free\s+/i, "");
  text = text.replace(/\b(?:no[- ]signup|free to play|no signup)\b/gi, "");
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const cut = text.split(/(?<=\.)\s/)[0];
  return cut.length > 280 ? cut.slice(0, 277).replace(/\s+\S*$/, "") + "…" : cut;
}

function replaceStats(html, counts) {
  const start = html.indexOf('class="stats"');
  const visual = html.indexOf('<section id="visual"', start);
  if (start < 0 || visual < 0) throw new Error("Homepage stats block not found");
  const nums = [counts.games, counts.demos, counts.screenshots, counts.source];
  let index = 0;
  const block = html.slice(start, visual).replace(/<b>[^<]*<\/b>/g, () => {
    const value = nums[index];
    index += 1;
    return `<b>${formatCount(value)}</b>`;
  });
  if (index !== 4) throw new Error("Homepage stats block does not have 4 counts");
  return html.slice(0, start) + block + html.slice(visual);
}

function countNote(locale, counts) {
  if (locale === "zh") {
    return `游戏、试玩链接、截图和源码链接是 ${counts.updatedOn} 目录里的条目数量。试玩链接只表示目录记录了一个网址，不是完整试玩。`;
  }
  return `Games, listed demo links, screenshots and source links are counts from the ${counts.updatedOn} catalog. A listed demo link is a URL stored in the catalog, not a completed playtest.`;
}

function upsertCountNote(html, locale, counts) {
  const note = `<p class="caption" id="catalog-counts">${escapeText(countNote(locale, counts))}</p>`;
  if (html.includes('id="catalog-counts"')) {
    return html.replace(/<p class="caption" id="catalog-counts">[\s\S]*?<\/p>/, note);
  }
  const marker = '<section id="visual"';
  if (!html.includes(marker)) throw new Error("Homepage visual section not found");
  return html.replace(marker, note + marker);
}

function releaseSection(locale, catalog) {
  const { date, games } = latestDayGames(catalog);
  const counts = countsFrom(catalog);
  const prefix = locale === "zh" ? "/zh/games/" : "/en/games/";
  const cards = games
    .map((game) => {
      const blurb = sentence(locale === "zh" ? game.descriptionZh || game.description : game.description);
      return `<article class="card"><a href="${prefix}${escapeAttr(game.slug)}/"><img src="${escapeAttr(game.image || "")}" alt="${escapeAttr(game.name)}"></a><div class="inside"><h3><a href="${prefix}${escapeAttr(game.slug)}/">${escapeText(game.name)}</a></h3>${blurb ? `<p>${escapeText(blurb)}</p>` : ""}<p><a href="${prefix}${escapeAttr(game.slug)}/">${locale === "zh" ? "目录页" : "Catalog entry"}</a></p></div></article>`;
    })
    .join("");
  const heading = locale === "zh" ? `正式目录更新 · ${date}` : `Catalog updated · ${date}`;
  const summary =
    locale === "zh"
      ? `这一天新进入目录的条目: ${games.length} · 目录总数: ${formatCount(counts.games)}。总数只统计目录条目。`
      : `Entries added on this date: ${games.length} · Catalog total: ${formatCount(counts.games)}. The total counts catalog entries.`;
  return `<section id="catalog-release" data-updated="${escapeAttr(date)}"><h2>${escapeText(heading)}</h2><p>${escapeText(summary)}</p><div class="cards">${cards}</div></section>`;
}

function replaceRelease(html, locale, catalog) {
  const start = html.indexOf('<section id="catalog-release"');
  const end = html.indexOf("</section>", start);
  if (start < 0 || end < 0) throw new Error("catalog-release section not found");
  return html.slice(0, start) + releaseSection(locale, catalog) + html.slice(end + "</section>".length);
}

function entriesHtml(locale, games) {
  const prefix = locale === "zh" ? "/zh/games/" : "/en/games/";
  return games
    .map(
      (game) =>
        `<div class="entry"><time>${escapeText(game.addedOn || "")}</time><div><b><a href="${prefix}${escapeAttr(game.slug)}/">${escapeText(game.name)}</a></b><small>${locale === "zh" ? "目录条目" : "Catalog entry"}</small></div></div>`
    )
    .join("");
}

function replaceEntries(html, locale, games) {
  const start = html.indexOf('<div class="entries" id="entries">');
  const end = html.indexOf('<div class="feedfooter">', start);
  if (start < 0 || end < 0) throw new Error("Recent discoveries list not found");
  const openEnd = html.indexOf(">", start) + 1;
  return html.slice(0, openEnd) + entriesHtml(locale, games) + "</div>" + html.slice(end);
}

function replaceJsonLd(html, locale, games) {
  const name = locale === "zh" ? "最近收录" : "Recent discoveries";
  const prefix = locale === "zh" ? "https://3f343.com/zh/games/" : "https://3f343.com/en/games/";
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (full, json) => {
    if (!json.includes("Recent discoveries") && !json.includes("最近收录") && !json.includes("最近发现")) return full;
    const data = JSON.parse(json);
    const list = (data["@graph"] || []).find((item) => item["@type"] === "ItemList");
    if (!list) return full;
    list.name = name;
    list.itemListElement = games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: game.name,
      url: prefix + game.slug + "/",
    }));
    return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
  });
}

function replacePulse(html, locale) {
  const start = html.indexOf('<div id="pulse-grid"');
  const end = html.indexOf('<div id="pulse-meta"', start);
  if (start < 0 || end < 0) return html;
  const openEnd = html.indexOf(">", start) + 1;
  const note =
    locale === "zh"
      ? "来源线索在页面脚本读取公开 feed 后显示。线索不是目录条目，也不是试玩记录。"
      : "Source leads appear here after the page script reads the public feed. A lead is not a catalog entry and is not a playtest.";
  return html.slice(0, openEnd) + `<p class="pulse-loading">${note}</p></div>` + html.slice(end);
}

function retitle(html) {
  let next = html;
  if (next.includes("<h1>Outpace</h1>")) {
    next = next.replace("<h1>Outpace</h1>", "<h2>Outpace</h2>");
  }
  next = next.replace(
    "<strong><em>3F343</em> · AI GAME RADAR</strong>",
    "<h1><em>3F343</em> · AI Game Radar</h1>"
  );
  if (!next.includes('id="home-h1-fix"')) {
    next = next.replace(
      "</head>",
      "<style id=\"home-h1-fix\">header h1{font-size:20px;line-height:1.2;margin:0;letter-spacing:-.035em}header h1 em{color:#efb767;font-style:normal}.hero h2{font-size:clamp(40px,5vw,71px);line-height:.98;letter-spacing:-.05em;margin:14px 0}</style></head>"
    );
  }
  return next;
}

function addDiscoveryLink(html, locale) {
  if (html.includes("/en/browser-ai-games/")) return html;
  const label = locale === "zh" ? "浏览器试玩链接（英文）" : "Browser demos";
  const link = `<a href="/en/browser-ai-games/">${label}</a>`;
  let next = html.replace("</nav><a class=\"lang\"", `${link}</nav><a class="lang"`);
  next = next.replace('<a href="/feeds/latest.xml">RSS</a>', `${link}<a href="/feeds/latest.xml">RSS</a>`);
  return next;
}

function stopEntriesOverwrite(html) {
  return html.replace(/e\("#entries"\)\.innerHTML=[\s\S]*?;/, "");
}

function historicalTotals(html) {
  return html
    .replace(
      "Catalog total: 1,243. Both games added October 25 remain in the previous release below.",
      "Release note for 2026-10-26. Current catalog totals are in the counts below."
    )
    .replace(
      "当前目录 1,243 款；昨日2款仍保留在下方历史记录。",
      "这是 2026-10-26 的更新记录。当前目录总数见下方统计。"
    );
}

function refreshHomepage(html, catalog, locale) {
  const loc = locale === "zh" ? "zh" : "en";
  const counts = countsFrom(catalog);
  if (counts.games !== catalogGames(catalog).length) {
    throw new Error("Catalog stats.games does not match the game list");
  }
  const recent = newestGames(catalog, 6);
  let next = html;
  next = replaceStats(next, counts);
  next = upsertCountNote(next, loc, counts);
  next = replaceRelease(next, loc, catalog);
  next = historicalTotals(next);
  next = replaceEntries(next, loc, recent);
  next = replaceJsonLd(next, loc, recent);
  next = replacePulse(next, loc);
  next = retitle(next);
  next = addDiscoveryLink(next, loc);
  next = stopEntriesOverwrite(next);
  next = next.replace(/name="agr-snapshot" content="[^"]*"/, `name="agr-snapshot" content="${counts.updatedOn}"`);
  next = absolutizeOgImages(next);
  return next;
}

module.exports = {
  countsFrom,
  formatCount,
  latestDayGames,
  newestGames,
  refreshHomepage,
  sentence,
};
