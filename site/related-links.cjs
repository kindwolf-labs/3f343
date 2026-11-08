"use strict";

const { upgradeDetailHtml } = require("./detail-page.cjs");
const { PAGE_PATH } = require("./discovery-page.cjs");

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function relatedGames(game, games, limit = 4) {
  const others = games.filter((item) => item.slug && item.slug !== game.slug);
  const sameDay = others.filter((item) => game.addedOn && item.addedOn === game.addedOn);
  const rest = others.filter((item) => !sameDay.includes(item));
  const pool = sameDay.concat(rest);
  return pool
    .slice()
    .sort((a, b) => {
      const day = Number(b.addedOn === game.addedOn) - Number(a.addedOn === game.addedOn);
      if (day) return day;
      return Math.abs(Number(a.id) - Number(game.id)) - Math.abs(Number(b.id) - Number(game.id)) || Number(a.id) - Number(b.id);
    })
    .slice(0, limit);
}

function relatedNav(game, games, locale) {
  const loc = locale === "zh" ? "zh" : "en";
  const picks = relatedGames(game, games);
  const links = picks
    .map((item) => `<li><a href="/${loc}/games/${escapeAttr(item.slug)}/">${escapeText(item.name)}</a></li>`)
    .join("");
  const label = loc === "zh" ? "其他目录条目" : "Other catalog entries";
  const indexLabel = loc === "zh" ? "浏览器试玩链接索引（英文）" : "Browser demo links";
  return `<nav id="catalog-related" aria-label="${label}"><p>${label}</p><ul>${links}</ul><p><a href="${PAGE_PATH}">${indexLabel}</a></p></nav>`;
}

function insertRelated(html, block) {
  if (html.includes('id="catalog-related"')) return html;
  if (html.includes('id="consent"')) return html.replace('<div id="consent"', block + '<div id="consent"');
  if (html.includes("</main>")) return html.replace("</main>", block + "</main>");
  return html.replace("</body>", block + "</body>");
}

function isEstablishedRich(html) {
  const head = String(html).split("</head>")[0];
  return (
    /property=["']og:title["']/i.test(head) &&
    /rel=["']canonical["']/i.test(head) &&
    /hreflang=["']zh-CN["']/i.test(head) &&
    /VideoGame/.test(head)
  );
}

function withRelatedLinks(html, game, games, locale) {
  const loc = locale === "zh" ? "zh" : "en";
  let next = html;
  if (!isEstablishedRich(next)) next = upgradeDetailHtml(next, game, loc);
  return insertRelated(next, relatedNav(game, games, loc));
}

module.exports = {
  insertRelated,
  isEstablishedRich,
  relatedGames,
  relatedNav,
  withRelatedLinks,
};
