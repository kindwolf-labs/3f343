#!/usr/bin/env node
"use strict";

/**
 * Render or backfill game detail HTML.
 *
 *   node scripts/render-game-detail.cjs --catalog catalog.json --slug bloom-hop-1282 --locale en
 *   node scripts/render-game-detail.cjs --catalog catalog.json --out out/games
 *   node scripts/render-game-detail.cjs --catalog catalog.json --patch-root out --only-slugs bloom-hop-1282 --dry-run
 *
 * --patch-root rewrites only:
 *   {root}/en/index.html and {root}/zh/index.html (relative og:image → absolute)
 *   {root}/{en,zh}/games/{catalog slug}/index.html (non-catalog hubs untouched)
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

const options=new Map();
const valued=new Set(["--catalog","--slug","--locale","--out","--patch-root","--only-slugs"]);
const boolean=new Set(["--dry-run","--all"]);
for (let i=2;i<process.argv.length;i++) {
  const [name,...tail]=process.argv[i].split("=");
  if ((!valued.has(name) && !boolean.has(name)) || options.has(name)) throw Error("Unknown or repeated option: " + name);
  if (boolean.has(name)) {
    if (tail.length) throw Error("Unexpected option value: " + name);
    options.set(name,true);
  } else {
    const value=tail.length ? tail.join("=") : process.argv[++i];
    if (!value || value.startsWith("--")) throw Error("Missing option value: " + name);
    options.set(name,value);
  }
}
function arg(name){ return options.get(name) || ""; }

function readCatalog(file) {
  if (!file) return { games: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeFile(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function patchRoot(root, games, selected, dryRun = false) {
  if (!games.size) throw new Error("--patch-root requires a non-empty authoritative --catalog");
  for (const slug of selected) {
    if (!games.has(slug)) throw new Error("Unknown catalog slug: " + slug);
  }
  const planned = [];
  const skipped = [];
  const matched = new Map([...selected].map(slug=>[slug,0]));
  const queue = (file, before, after) => {
    if (before !== after) planned.push({ file, after });
  };
  for (const locale of ["en", "zh"]) {
    const home = path.join(root, locale, "index.html");
    if (selected.size === 0 && fs.existsSync(home)) {
      const before = fs.readFileSync(home, "utf8");
      const after = absolutizeOgImages(before);
      queue(home, before, after);
    }
    const dir = path.join(root, locale, "games");
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      if (selected.size && !selected.has(slug)) continue;
      const file = path.join(dir, slug, "index.html");
      if (!fs.existsSync(file)) continue;
      const game = games.get(slug);
      if (!game) {
        skipped.push(path.relative(root, file));
        continue;
      }
      if (selected.has(slug)) matched.set(slug,matched.get(slug)+1);
      const before = fs.readFileSync(file, "utf8");
      const after = upgradeDetailHtml(before, game, locale);
      const missing = missingRichTags(after);
      if (missing.length) {
        throw new Error(`${file} still missing ${missing.join(", ")}`);
      }
      queue(file, before, after);
    }
  }
  for (const [slug,count] of matched) if (count!==2) throw Error("Expected both EN and ZH pages for " + slug + "; found " + count);
  if (!dryRun) {
    for (const { file, after } of planned) fs.writeFileSync(file, after);
  }
  return { updated: dryRun ? 0 : planned.length, wouldUpdate: planned.length, skipped };
}

function main() {
  const catalog = readCatalog(arg("--catalog"));
  const games = indexGames(catalog);
  const patch = arg("--patch-root");
  if (patch) {
    const selected = new Set(arg("--only-slugs").split(",").map((s) => s.trim()).filter(Boolean));
    const dryRun = Boolean(arg("--dry-run"));
    if ((options.has("--only-slugs") && !selected.size) || options.has("--all") === options.has("--only-slugs")) {
      throw Error("--patch-root needs exactly one of --only-slugs or --all");
    }
    const result = patchRoot(patch, games, selected, dryRun);
    console.log(JSON.stringify({ dryRun, ...result }));
    return;
  }

  if (arg("--only-slugs") || arg("--all") || arg("--dry-run")) throw Error("Backfill flags require --patch-root");
  const out = arg("--out");
  const slug = arg("--slug");
  const locale = arg("--locale") || "en";
  if (locale !== "en" && locale !== "zh") throw Error("Invalid locale");
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
