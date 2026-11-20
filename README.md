# 3F343 — AI / vibe-coded game radar

Public catalog of AI-built and vibe-coded games. Source, screenshot and browser demo links are included when available; a listed demo link is not a playtest.

- Site (EN): https://3f343.com/en/
- Site (ZH): https://3f343.com/zh/
- Soft write-up: https://gist.github.com/kindwolf-labs/b5b78ee070af6c61d7eb1c11902ec656

## Why
3F343 records what is known about a project and distinguishes a developer source, a listed demo, and independent hands-on play. See the live homepage for current catalog totals.

## Recent verified picks
- [Lantern Sums](https://3f343.com/en/games/lantern-sums-1245/)
- [Sim Shire](https://3f343.com/en/games/sim-shire-1244/)
- [ChompChomp.io](https://3f343.com/en/games/chompchomp-io-1246/)

## Detail pages
New listings should be rendered with `renderDetailPage()` in `site/detail-page.cjs` (en and zh). That head matches the rich pattern already live on pages such as `/en/games/outpace-346/`: meta description, hreflang, absolute Open Graph URL and image, VideoGame JSON-LD, and Vercel Web Analytics. Copy comes from the catalog description or the sentence already on the page. Feature-tag lines (`玩法：` / `技术：`) and “no description” placeholders stay out of the meta description.

Preview a **scoped** backfill on a copy of the current production build. This does not edit hubs, feeds, `robots.txt` or `sitemap.xml`. Scope is mandatory. `--only-slugs` requires both language files; `--all` operates on all catalog details and normalizes homepage image URLs. Existing alternate languages, custom head tags, analytics and body copy are preserved; conflicting canonical or hreflang tags abort the backfill.

```bash
node --test
node scripts/render-game-detail.cjs --catalog out/data/catalog.json --patch-root out --only-slugs cyber-sunday-5 --dry-run
node scripts/render-game-detail.cjs --catalog out/data/catalog.json --patch-root out --only-slugs cyber-sunday-5
node scripts/render-game-detail.cjs --catalog catalog.json --slug gitche-gumee-1299 --locale en
```

Current production HTML is packed into `pages.json.gz` and deployed on the Vercel project `3f343-home-refresh` (`src/build.cjs` only unpacks that archive). `3f343.com` serves that bundle. Merging this repo does not rewrite pages already deployed. For a release, start from the active production engine's full source and rebuild through its existing workflow. Verify the candidate against the current catalog and templates before promotion. This repository is not an authoritative site snapshot.

## Feedback welcome
Better discovery sources, missed playable titles, or pushback on verification criteria — open an issue here or reply on the gist.
