# 3F343 — AI / vibe-coded game radar

Public bilingual catalog of browser games with a listed demo URL (source linked when available; license preferred). The pinned content snapshot is **1,321** games dated **2026-11-14**. An older note below still says 1,246; that figure is not the current catalog.

- Site (EN): https://3f343.com/en/
- Site (ZH): https://3f343.com/zh/
- Soft write-up: https://gist.github.com/kindwolf-labs/b5b78ee070af6c61d7eb1c11902ec656

## Why
Lots of “AI game” pages don’t play. 3F343 only admits entries you can open in a browser. Formal catalog size: **1246** (2026-10-31 Asia/Shanghai). Homepage shows a review log even when a cycle admits 0.

## Recent verified picks
- [Lantern Sums](https://3f343.com/en/games/lantern-sums-1245/)
- [Sim Shire](https://3f343.com/en/games/sim-shire-1244/)
- [ChompChomp.io](https://3f343.com/en/games/chompchomp-io-1246/)

## Detail pages
New listings should be rendered with `renderDetailPage()` in `site/detail-page.cjs` (en and zh). That head matches the rich pattern already live on pages such as `/en/games/outpace-346/`: meta description, hreflang, absolute Open Graph URL and image, VideoGame JSON-LD, and Vercel Web Analytics. Copy comes from the catalog description or the sentence already on the page. Feature-tag lines (`玩法：` / `技术：`) and “no description” placeholders stay out of the meta description.

Backfill an existing static tree without rewriting `robots.txt` or `sitemap.xml`:

```bash
node scripts/render-game-detail.cjs --catalog catalog.json --patch-root out
node scripts/render-game-detail.cjs --catalog catalog.json --slug gitche-gumee-1299 --locale en
```

Current production HTML is packed into `pages.json.gz` and deployed on the Vercel project `3f343-home-refresh` (`src/build.cjs` only unpacks that archive). `3f343.com` serves that bundle. Merging this repo does not rewrite pages already deployed. The next ingest needs a full detail-page regen with this renderer, then the usual deploy. Leave `robots.txt` and `sitemap.xml` as they are.

## Offline editorial pipeline

This is a draft editing tool. It is not an autonomous site, and it does not discover games, call a model, schedule work, or publish.

The current production content is the verified snapshot in `snapshot/home-refresh-20261115/` (`pages.json.gz`, `release-manifest.json`, and `static/`). That pack was checked against the live origin. It is not the output of the historical `build_candidate.py` generator. That script, and the 1319 inputs under `archive/build-inputs-20261115/`, build an older catalog and are not run here.

```bash
node pipeline/run.cjs
node --test test/pipeline.test.cjs
```

`node pipeline/run.cjs` reads the pinned catalog and the six evidence records in `pipeline/inputs/evidence-six.json`. It writes `pipeline/output/`. The same inputs produce the same files. The queue lists all 1,321 catalog ids. Only the six records carry check times. Every other id stays `not_checked`. A URL that returned HTTP 200 is `endpoint_reachable`, and `playtested_at` stays empty.

The default publication diff is blocked until a person passes `--approve <file>`. That file is a review note. The command still does not write production, change the catalog, or deploy. A deletion request is refused. A catalog that is no longer 1..1321 dated 2026-11-14 blocks the diff.

```bash
node pipeline/run.cjs --approve approval.json --out /tmp/wp4-approved
node scripts/pr4-candidate.cjs --out candidate
node scripts/serve-pack.cjs /path/to/unpacked-candidate 8766
```

The candidate preview is a separate pack: `pages.json.gz` plus `static/`. Unzip the content volume and both static volumes into one folder, then run `serve-pack.cjs` there.

## Feedback welcome
Better discovery sources, missed playable titles, or pushback on verification criteria — open an issue here or reply on the gist.
