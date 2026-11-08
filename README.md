# 3F343 — AI / vibe-coded game radar

Public bilingual catalog of **browser-playable** AI-built / vibe-coded games (source linked when available; license preferred).

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

On every ingest, after `data/catalog.json` is final, refresh the homepages from that catalog and add related catalog links. This is what keeps the visible counts, the latest-release block, and the Recent discoveries JSON-LD on the same date and entries as the catalog:

```bash
node scripts/apply-catalog-refresh.cjs --root out
node scripts/pack-home-refresh.cjs --root out --out dist
```

`refreshHomepage()` rewrites counts, the latest catalog-release block, and the recent-entry list. It does not turn a listed demo URL into a playtest. `robots.txt` stays as published. The sitemap only gains `/en/browser-ai-games/` when that page is added.

Production HTML is packed into `pages.json.gz` and deployed on the Vercel project `3f343-home-refresh`. Do not deploy `ai-game-radar`. A merge does not rewrite pages already uploaded; the ingest has to pack and deploy the refreshed tree.

## Feedback welcome
Better discovery sources, missed playable titles, or pushback on verification criteria — open an issue here or reply on the gist.
