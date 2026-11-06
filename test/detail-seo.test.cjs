"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const {
  absolutizeOgImages,
  missingRichTags,
  renderDetailPage,
  upgradeDetailHtml,
} = require("../site/detail-page.cjs");

const gitche = {
  id: 1299,
  slug: "gitche-gumee-1299",
  name: "Gitche Gumee",
  github: "https://github.com/edwestfieldjr/gitchegumee",
  demo: "https://westfield.dev/gitchegumee/play/",
  description:
    "Retro memorial sailing game about the Edmund Fitzgerald's last Lake Superior voyage: chart/helm modes, one-sitting run. MIT LICENSE verified; GitHub description Vibe-coded in Rust + Bevy and CLAUDE.md project brief; official site/img/helm.png; browser play at westfield.dev/gitchegumee/play/.",
  descriptionZh:
    "纪念性复古航海：重走 1975 年 Edmund Fitzgerald 在苏必利尔湖最后航程，图表调度与舵位卷轴两段模式、一局走完。已核验 MIT；仓库描述 Vibe-coded in Rust + Bevy，并有 CLAUDE.md；官方 site/img/helm.png；westfield.dev/gitchegumee/play/ 浏览器可玩。",
  addedOn: "2026-11-06",
  models: ["Claude Code", "Vibe Coding"],
  tech: ["Rust", "Bevy", "HTML", "Canvas", "Browser"],
  image: "https://3f343.com/media/gitche-gumee.jpg",
};

const bloom = {
  id: 1282,
  slug: "bloom-hop-1282",
  name: "Bloom Hop",
  github: "https://github.com/zeveck/bloom-hop",
  demo: "https://bloomhop.synapticnoise.com/",
  description:
    "Cozy frog puzzle on a lily pond: hop pads, dodge diving turtles and beetles across morning/sunset/moonlit ponds, then unlock Wild Pond. MIT LICENSE verified; README says the whole game was made by Claude Code with gamegen (art via Gemini); official media/screenshots.",
  descriptionZh:
    "荷塘青蛙解谜：跳睡莲、躲开潜水龟与甲虫，晨昏月夜三塘后解锁 Wild Pond。已核验 MIT LICENSE；README 写明整作由 Claude Code + gamegen 完成（画面 Gemini）；官方 media/screenshots。",
  addedOn: "2026-11-04",
  models: ["Claude Code", "Gemini", "Vibe Coding"],
  tech: ["HTML", "JavaScript", "Browser"],
  image: "/media/bloom-hop.jpg",
};

const outpace = {
  id: 346,
  slug: "outpace-346",
  name: "Outpace",
  github: "https://github.com/ethanplusai/outpace",
  demo: "https://outpace.ethanplus.ai/",
  description: "玩法：打字控制 · 跳跃 · 追逐 · 生命值 · 碰撞 · 得分 · 敌人 · 波次挑战",
  addedOn: "2026-09-30",
  models: ["Claude Opus 5.5", "Claude Sonnet 5.5"],
  tech: ["JavaScript", "Canvas 2D", "Node.js"],
  image:
    "https://raw.githubusercontent.com/ethanplusai/outpace/9500d7d52279c1b770257c979847e3559196d99a/docs/screenshots/hero.png",
};

function thinPage(slug, name, paragraph) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} | 3F343</title><link rel="canonical" href="https://3f343.com/en/games/${slug}/"><style>body{margin:0}</style></head><body><main><h1>${name}</h1><p>${paragraph}</p><img src="/media/${slug}.jpg" alt="${name}"></main></body></html>`;
}

test("recent ids render the same head richness as outpace-346", () => {
  for (const game of [gitche, bloom]) {
    assert.ok(game.id >= 1280);
    for (const locale of ["en", "zh"]) {
      const html = renderDetailPage(game, locale);
      assert.deepEqual(missingRichTags(html), []);
      assert.match(html, /\| AI Game Radar/);
      assert.doesNotMatch(html, /twitter:card/);
      assert.match(html, /property="og:url" content="https:\/\/3f343\.com\//);
      assert.match(html, /property="og:image" content="https:\/\/3f343\.com\/media\//);
      assert.match(html, /"@type":"VideoGame"/);
      assert.match(html, /\/_vercel\/insights\/script\.js/);
      assert.match(html, new RegExp(`hreflang="zh-CN" href="https://3f343.com/zh/games/${game.slug}/"`));
      assert.match(html, new RegExp(`hreflang="x-default" href="https://3f343.com/en/games/${game.slug}/"`));
    }
  }
  const en = renderDetailPage(gitche, "en");
  assert.match(en, /Edmund Fitzgerald/);
  assert.doesNotMatch(en, /打字控制/);
  const zh = renderDetailPage(gitche, "zh");
  assert.match(zh, /lang="zh-CN"/);
  assert.match(zh, /纪念性复古航海/);
  const bloomHtml = renderDetailPage(bloom, "en");
  assert.match(bloomHtml, /content="https:\/\/3f343\.com\/media\/bloom-hop\.jpg"/);
  assert.match(bloomHtml, /lily pond/);
});

test("upgrading a thin page keeps its copy and fills the head", () => {
  const original = thinPage(
    "gitche-gumee-1299",
    "Gitche Gumee",
    "Retro memorial sailing game about the Edmund Fitzgerald's last Lake Superior voyage."
  );
  const once = upgradeDetailHtml(original, gitche, "en");
  const twice = upgradeDetailHtml(once, gitche, "en");
  assert.deepEqual(missingRichTags(once), []);
  assert.equal(once, twice);
  assert.match(once, /<p>Retro memorial sailing game about the Edmund Fitzgerald's last Lake Superior voyage\.<\/p>/);
  assert.match(once, /property="og:image" content="https:\/\/3f343\.com\/media\/gitche-gumee-1299\.jpg"/);
  assert.doesNotMatch(once, /玩法：/);
});

test("rich pages keep external absolute images and gain og:description", () => {
  const rich = `<!doctype html><html lang="en"><head><title>Outpace | AI Game Radar</title><meta name="description" content="Screenshots, playable demo and source of Outpace."><link rel="canonical" href="https://3f343.com/en/games/outpace-346/"><meta property="og:title" content="Outpace | AI Game Radar"><meta property="og:url" content="https://3f343.com/en/games/outpace-346/"><meta property="og:image" content="https://raw.githubusercontent.com/ethanplusai/outpace/9500d7d52279c1b770257c979847e3559196d99a/docs/screenshots/hero.png"><style>body{color:#fff}</style></head><body><div class="wrap"><h1>Outpace | AI Game Radar</h1><p>Screenshots, playable demo and source of Outpace.</p><h2>Gameplay &amp; features</h2><p>Gameplay: typing controls</p></div></body></html>`;
  const html = upgradeDetailHtml(rich, outpace, "en");
  assert.deepEqual(missingRichTags(html), []);
  assert.match(html, /og:image" content="https:\/\/raw\.githubusercontent\.com\/ethanplusai\/outpace\//);
  assert.match(html, /og:description" content="Screenshots, playable demo and source of Outpace\."/);
  assert.match(html, /Gameplay: typing controls/);
  assert.doesNotMatch(html, /打字控制/);
  assert.match(html, /<style>body\{color:#fff\}<\/style>/);
});

test("placeholder and feature-tag copy do not become the meta description", () => {
  const html = upgradeDetailHtml(
    thinPage("endless-dash-81", "Endless Dash", "No description in the original catalog."),
    {
      slug: "endless-dash-81",
      name: "Endless Dash",
      description: "玩法：得分",
      image: "https://opengraph.githubassets.com/agr-81/example/repo",
    },
    "en"
  );
  assert.match(html, /content="Screenshots, playable demo and source of Endless Dash\."/);
  assert.match(html, /<p>No description in the original catalog\.<\/p>/);
  assert.match(html, /og:image" content="https:\/\/3f343\.com\/media\/endless-dash-81\.jpg"/);
  const fromCatalog = upgradeDetailHtml(
    `<!doctype html><html lang="en"><head><title>Endless Dash | 3F343</title><link rel="canonical" href="https://3f343.com/en/games/endless-dash-81/"></head><body><h1>Endless Dash</h1><p>No description in the original catalog.</p></body></html>`,
    {
      slug: "endless-dash-81",
      name: "Endless Dash",
      image: "https://opengraph.githubassets.com/agr-81/example/repo",
    },
    "en"
  );
  assert.match(fromCatalog, /og:image" content="https:\/\/opengraph\.githubassets\.com\//);
});

test("truncated mid-template descriptions expand to the catalog sentence", () => {
  const partial =
    '<!doctype html><html lang="en"><head><title>Grand Theft Argon | 3F343</title><meta name="description" content="A cel-shaded open-world action game set in a neon 1986 city. Drive sports cars, pilot helicopters and boats, and face police pursuits through a day-and-night wo"><link rel="canonical" href="https://3f343.com/en/games/grand-theft-argon-1225/"></head><body><p>A cel-shaded open-world action game set in a neon 1986 city. Drive sports cars, pilot helicopters and boats, and face police pursuits through a day-and-night world.</p></body></html>';
  const html = upgradeDetailHtml(
    partial,
    {
      slug: "grand-theft-argon-1225",
      name: "Grand Theft Argon",
      description:
        "A cel-shaded open-world action game set in a neon 1986 city. Drive sports cars, pilot helicopters and boats, and face police pursuits through a day-and-night world.",
      image: "https://3f343.com/media/grand-theft-argon.png",
    },
    "en"
  );
  assert.match(html, /day-and-night world\./);
  assert.doesNotMatch(html, /day-and-night wo"/);
});

test("homepage og:image becomes an absolute 3f343.com URL", () => {
  const home =
    '<head><meta property="og:title" content="AI Game Radar"><meta property="og:url" content="https://3f343.com/en/"><meta property="og:image" content="/assets/outpace.png"></head>';
  const html = absolutizeOgImages(home);
  assert.match(html, /content="https:\/\/3f343\.com\/assets\/outpace\.png"/);
  assert.equal(absolutizeOgImages(html), html);
});

test("patch-root updates detail pages and the homepage without touching robots or sitemap", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "f343-seo-"));
  fs.mkdirSync(path.join(root, "en", "games", "bloom-hop-1282"), { recursive: true });
  fs.mkdirSync(path.join(root, "zh"), { recursive: true });
  fs.writeFileSync(path.join(root, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://3f343.com/sitemap.xml\n");
  fs.writeFileSync(path.join(root, "sitemap.xml"), "<urlset></urlset>");
  fs.writeFileSync(
    path.join(root, "en", "index.html"),
    '<html><head><meta property="og:image" content="/assets/outpace.png"></head></html>'
  );
  fs.writeFileSync(
    path.join(root, "zh", "index.html"),
    '<html><head><meta property="og:image" content="/assets/outpace.png"></head></html>'
  );
  fs.writeFileSync(
    path.join(root, "en", "games", "bloom-hop-1282", "index.html"),
    thinPage("bloom-hop-1282", "Bloom Hop", bloom.description)
  );
  const catalog = path.join(root, "catalog.json");
  fs.writeFileSync(catalog, JSON.stringify({ games: [bloom] }));
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "../scripts/render-game-detail.cjs"), "--catalog", catalog, "--patch-root", root],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  const page = fs.readFileSync(path.join(root, "en", "games", "bloom-hop-1282", "index.html"), "utf8");
  assert.deepEqual(missingRichTags(page), []);
  assert.match(page, /lily pond/);
  assert.match(fs.readFileSync(path.join(root, "en", "index.html"), "utf8"), /https:\/\/3f343\.com\/assets\/outpace\.png/);
  assert.match(fs.readFileSync(path.join(root, "zh", "index.html"), "utf8"), /https:\/\/3f343\.com\/assets\/outpace\.png/);
  assert.equal(
    fs.readFileSync(path.join(root, "robots.txt"), "utf8"),
    "User-agent: *\nAllow: /\nSitemap: https://3f343.com/sitemap.xml\n"
  );
  assert.equal(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"), "<urlset></urlset>");
});
