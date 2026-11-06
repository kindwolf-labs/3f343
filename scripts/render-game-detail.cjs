#!/usr/bin/env node
"use strict";

/**
 * Render or backfill game detail HTML.
 *
 *   node scripts/render-game-detail.cjs --catalog catalog.json --slug bloom-hop-1282 --locale en
 *   node scripts/render-game-detail.cjs --catalog catalog.json --out out/games
 *   node scripts/render-game-detail.cjs --catalog catalog.json --patch-root out
 *
 * --patch-root rewrites only:
 *   {root}/en/index.html and {root}/zh/index.html (relative og:image → absolute)
 *   {root}/{en,zh}/games/{slug}/index.html
 * It does not open robots.txt, sitemap.xml, or feeds.
 *
 * A production deploy of 3f343-home-refresh still has to rebuild pages.json.gz
 * from this output. Merging the renderer does not rewrite pages already uploaded.
 */

const fs = require("fs");
const path = require("path");
const {
  absolutizeOgImages,
  indexGames,
  missingRichTags,
  renderDetailPage,
  upgradeDetailHtml,
} = require("../site/detail-page.cjs");

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function readCatalog(file) {
  if (!file) return { games: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeFile(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function patchRoot(root, games) {
  const touched = [];
  for (const locale of ["en", "zh"]) {
    const home = path.join(root, locale, "index.html");
    if (fs.existsSync(home)) {
      const before = fs.readFileSync(home, "utf8");
      const after = absolutizeOgImages(before);
      if (after !== before) fs.writeFileSync(home, after);
      touched.push(home);
    }
    const dir = path.join(root, locale, "games");
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const file = path.join(dir, slug, "index.html");
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, "utf8");
      const game = games.get(slug) || { slug };
      const after = upgradeDetailHtml(before, game, locale);
      fs.writeFileSync(file, after);
      const missing = missingRichTags(after);
      if (missing.length) {
        throw new Error(`${file} still missing ${missing.join(", ")}`);
      }
      touched.push(file);
    }
  }
  return touched;
}

function main() {
  const catalog = readCatalog(arg("--catalog"));
  const games = indexGames(catalog);
  const patch = arg("--patch-root");
  if (patch) {
    const touched = patchRoot(patch, games);
    console.log(JSON.stringify({ patched: touched.length }));
    return;
  }

  const out = arg("--out");
  const slug = arg("--slug");
  const locale = arg("--locale") || "en";
  if (slug) {
    const game = games.get(slug);
    if (!game) throw new Error("Unknown slug " + slug);
    const html = renderDetailPage(game, locale);
    const missing = missingRichTags(html);
    if (missing.length) throw new Error(slug + " missing " + missing.join(", "));
    if (out) writeFile(path.join(out, locale, "games", slug, "index.html"), html);
    else process.stdout.write(html);
    return;
  }

  if (!out) {
    throw new Error("Pass --slug, --out, or --patch-root");
  }
  let count = 0;
  for (const game of games.values()) {
    for (const loc of ["en", "zh"]) {
      const html = renderDetailPage(game, loc);
      const missing = missingRichTags(html);
      if (missing.length) throw new Error(`${game.slug} ${loc} missing ${missing.join(", ")}`);
      writeFile(path.join(out, loc, "games", game.slug, "index.html"), html);
      count += 1;
    }
  }
  console.log(JSON.stringify({ rendered: count }));
}

main();
