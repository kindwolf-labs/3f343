#!/usr/bin/env node
"use strict";

/**
 * Refresh a mirrored static tree from its own data/catalog.json.
 * Does not download or deploy. Leaves robots.txt unchanged.
 *
 *   node scripts/apply-catalog-refresh.cjs --root /path/to/mirror
 */

const fs = require("fs");
const path = require("path");
const { refreshHomepage } = require("../site/homepage-refresh.cjs");
const { PAGE_URL, renderDiscoveryPage } = require("../site/discovery-page.cjs");
const { withRelatedLinks } = require("../site/related-links.cjs");

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function addSitemap(xml) {
  if (xml.includes(PAGE_URL)) return xml;
  if (!xml.includes("</urlset>")) throw new Error("sitemap has no urlset");
  return xml.replace("</urlset>", `<url><loc>${PAGE_URL}</loc></url></urlset>`);
}

function main() {
  const root = arg("--root");
  if (!root) throw new Error("Pass --root");
  const catalogPath = path.join(root, "data", "catalog.json");
  const catalog = JSON.parse(read(catalogPath));
  const before = catalog.updatedOn;
  const games = catalog.games || [];
  write(path.join(root, "en", "index.html"), refreshHomepage(read(path.join(root, "en", "index.html")), catalog, "en"));
  write(path.join(root, "zh", "index.html"), refreshHomepage(read(path.join(root, "zh", "index.html")), catalog, "zh"));
  write(path.join(root, "en", "games", "browser-ai-games", "index.html"), renderDiscoveryPage(catalog));
  const sitemapPath = path.join(root, "sitemap.xml");
  if (fs.existsSync(sitemapPath)) write(sitemapPath, addSitemap(read(sitemapPath)));
  let details = 0;
  for (const locale of ["en", "zh"]) {
    const dir = path.join(root, locale, "games");
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const file = path.join(dir, slug, "index.html");
      if (!fs.existsSync(file)) continue;
      const game = games.find((item) => item.slug === slug) || { slug, name: slug };
      write(file, withRelatedLinks(read(file), game, games, locale));
      details += 1;
    }
  }
  const after = JSON.parse(read(catalogPath));
  if (after.updatedOn !== before || after.games.length !== games.length) {
    throw new Error("catalog.json changed during refresh");
  }
  console.log(JSON.stringify({ updatedOn: before, games: games.length, details, discovery: PAGE_URL }));
}

main();
