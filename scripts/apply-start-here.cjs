#!/usr/bin/env node
"use strict";

/**
 * Patch the unpacked 3f343 homepage and the Start here detail pages.
 *
 *   node scripts/apply-start-here.cjs \
 *     --catalog test/fixtures/catalog-2026-11-14.json \
 *     --baseline baseline/live-2026-11-14 \
 *     --out preview/pages
 *
 * The baseline is the public output of home-refresh deployment
 * dpl_6izEMLtaFGv4H1EyUsaukXpmfdDK (catalog 1321 / 2026-11-14).
 * This script does not download, pack, or deploy. It does not open
 * robots.txt or sitemap.xml except to copy robots.txt through unchanged
 * when it is present in the baseline.
 */

const fs = require("fs");
const path = require("path");
const { patchDetail, patchHomepage, selectStartHere } = require("../site/start-here.cjs");

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function main() {
  const catalogPath = arg("--catalog");
  const baseline = arg("--baseline");
  const out = arg("--out");
  if (!catalogPath || !baseline || !out) {
    throw new Error("Required: --catalog --baseline --out");
  }
  const catalog = JSON.parse(read(catalogPath));
  const games = catalog.games || [];
  const picks = selectStartHere(games);
  if (picks.length < 4 || picks.length > 6) {
    throw new Error("Start here selection must be 4–6 games, got " + picks.length);
  }
  const bySlug = new Map(games.map((game) => [game.slug, game]));
  for (const locale of ["en", "zh"]) {
    const homeIn = path.join(baseline, locale, "index.html");
    const home = patchHomepage(read(homeIn), picks, locale);
    write(path.join(out, locale, "index.html"), home);
    for (const pick of picks) {
      const game = bySlug.get(pick.game.slug);
      const detailIn = path.join(baseline, locale, "games", `${game.slug}.html`);
      if (!fs.existsSync(detailIn)) {
        throw new Error("Missing baseline detail " + detailIn);
      }
      const detail = patchDetail(read(detailIn), game, pick, games, locale);
      write(path.join(out, locale, "games", game.slug, "index.html"), detail);
    }
  }
  const passthrough = [
    ["llms.txt", "llms.txt"],
    ["robots.txt", "robots.txt"],
    ["en/games/browser-ai-games.html", "en/games/browser-ai-games/index.html"],
  ];
  for (const [from, to] of passthrough) {
    const source = path.join(baseline, from);
    if (!fs.existsSync(source)) continue;
    write(path.join(out, to), read(source));
  }
  const report = {
    catalogCount: games.length,
    catalogUpdated: catalog.updatedOn,
    slugs: picks.map((pick) => pick.slot + ":" + pick.game.slug),
  };
  write(path.join(out, "start-here-selection.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}

main();
