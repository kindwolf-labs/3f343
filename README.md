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

Current production HTML is packed into `pages.json.gz` and deployed on the Vercel project `3f343-home-refresh` (`src/build.cjs` only unpacks that archive). `3f343.com` serves that bundle. Merging this repo does not rewrite pages already deployed. The next ingest needs a full detail-page regen with this renderer, then the usual deploy. Leave `robots.txt` and `sitemap.xml` as they are.

## Feedback welcome
Better discovery sources, missed playable titles, or pushback on verification criteria — open an issue here or reply on the gist.
