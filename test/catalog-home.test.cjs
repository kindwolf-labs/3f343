"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { countsFrom, refreshHomepage } = require("../site/homepage-refresh.cjs");
const { browserEntries, renderDiscoveryPage } = require("../site/discovery-page.cjs");
const { isEstablishedRich, withRelatedLinks } = require("../site/related-links.cjs");
const { missingRichTags } = require("../site/detail-page.cjs");

const catalog = {
  updatedOn: "2026-11-08",
  stats: { games: 4, demos: 3, source: 4, screenshots: 2 },
  games: [
    {
      id: 346,
      slug: "outpace-346",
      name: "Outpace",
      addedOn: "2026-09-30",
      demo: "https://outpace.ethanplus.ai/",
      github: "https://github.com/ethanplusai/outpace",
      description: "Screenshots, playable demo and source of Outpace.",
      image: "https://3f343.com/assets/outpace.png",
      mediaType: "gameplay",
      accessType: "browser",
      tech: ["Browser"],
    },
    {
      id: 1313,
      slug: "neon-protocol-1313",
      name: "Neon Protocol: Uprising",
      addedOn: "2026-11-07",
      demo: "https://tristanhotham.com/games/neon-protocol/",
      github: "https://github.com/Tristan-Hotham/neon-protocol",
      description: "Tactics battles with base building against a rogue city AI.",
      image: "https://3f343.com/media/neon-protocol.jpg",
      mediaType: "gameplay",
      accessType: "browser",
      tech: ["Browser"],
    },
    {
      id: 1314,
      slug: "popbomb-arena-1314",
      name: "PopBomb Arena",
      addedOn: "2026-11-08",
      demo: "https://wubin1998.github.io/popbomb-arena/",
      github: "https://github.com/wubin1998/popbomb-arena",
      description: "Browser Bomberman-style arena with stage flow and item pickups.",
      descriptionZh: "浏览器炸弹人风格竞技场。",
      image: "https://3f343.com/media/popbomb-arena.jpg",
      mediaType: "gameplay",
      accessType: "browser",
      tech: ["Browser"],
    },
    {
      id: 1315,
      slug: "nappy-1315",
      name: "Nappy",
      addedOn: "2026-11-08",
      demo: "https://nappy.josuakrause.com/",
      github: "https://github.com/JosuaKrause/nappy",
      description: "Browser 2.5D city stroll with a pram.",
      descriptionZh: "浏览器 2.5D 城市散步。",
      image: "https://3f343.com/media/nappy.jpg",
      mediaType: "gameplay",
      accessType: "browser",
      tech: ["Browser"],
    },
  ],
};

function fakeHome(locale) {
  const prefix = locale === "zh" ? "/zh" : "/en";
  const total = locale === "zh" ? "当前目录 1,243 款；昨日2款仍保留在下方历史记录。" : "Catalog total: 1,243. Both games added October 25 remain in the previous release below.";
  const entriesLine =
    locale === "zh"
      ? `e("#entries").innerHTML=x.length?x.map(g=>'<div class="entry"></div>').join(""):'<p class="caption">最近72小时暂无有证据的新项目</p>';`
      : `e("#entries").innerHTML=x.length?x.map(g=>'<div class="entry"></div>').join(""):'<p class="caption">No new sourced project leads in the past 72 hours</p>';`;
  return `<!doctype html><html lang="${locale}"><head><title>AI Game Radar</title><meta property="og:image" content="/assets/outpace.png"><meta name="agr-snapshot" content="2026-10-11"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"AI Game Radar","url":"https://3f343.com"},{"@type":"ItemList","name":"Recent discoveries","itemListElement":[{"@type":"ListItem","position":1,"name":"Number-Plus-One","url":"https://github.com/shingchan17/Number-Plus-One"},{"@type":"ListItem","position":2,"name":"Codex-Game-Studios","url":"https://github.com/WebWork-rrs/Codex-Game-Studios"}]}]}</script></head><body><div class="wrap"><header><a href="${prefix}/"><strong><em>3F343</em> · AI GAME RADAR</strong></a><nav><a href="#catalog">All games</a></nav><a class="lang" href="/zh/">中文</a></header><section id="catalog-increment-20261026"><h2>2026-10-26</h2><p>${total}</p></section><section id="catalog-release" data-updated="2026-10-31"><h2>Catalog updated · 2026-10-31</h2><p>Verified additions: 5 · Catalog total: 1253</p></section><div id="pulse-grid" class="pulse-grid"><a><time>2026-10-14</time><strong>Argon Tennis</strong></a></div><div id="pulse-meta"></div><div class="feed"><h2>Recent discoveries</h2><div class="entries" id="entries"><div class="entry"><time>2026-10-14</time><b>Argon Tennis</b></div></div><div class="feedfooter"></div></div><div class="stats"><div class="stat"><b>1,253</b><small>Games</small></div><div class="stat"><b>674</b><small>Listed demo links</small></div><div class="stat"><b>244</b><small>Screenshots</small></div><div class="stat"><b>1,250</b><small>Source links</small></div></div><section id="visual"></section><div class="foot"><nav><a href="/feeds/latest.xml">RSS</a></nav></div></div><script>${entriesLine} e("#feeddate").textContent="x";</script></body></html>`;
}

test("homepage counts, H1, and recent discoveries match the catalog", () => {
  const html = refreshHomepage(fakeHome("en"), catalog, "en");
  const again = refreshHomepage(html, catalog, "en");
  assert.equal(html, again);
  assert.match(html, /<h1><em>3F343<\/em> · AI Game Radar<\/h1>/);
  assert.doesNotMatch(html, /<h1>Outpace<\/h1>/);
  assert.match(html, /<b>4<\/b><small>Games<\/small>/);
  assert.match(html, /<b>3<\/b><small>Listed demo links<\/small>/);
  assert.match(html, /<b>2<\/b><small>Screenshots<\/small>/);
  assert.match(html, /<b>4<\/b><small>Source links<\/small>/);
  assert.match(html, /Catalog updated · 2026-11-08/);
  assert.match(html, /Nappy/);
  assert.match(html, /PopBomb Arena/);
  assert.doesNotMatch(html, /Catalog total: 1253/);
  assert.doesNotMatch(html, /Catalog total: 1,243/);
  assert.doesNotMatch(html, /2026-10-14/);
  assert.doesNotMatch(html, /Number-Plus-One/);
  assert.doesNotMatch(html, /Codex-Game-Studios/);
  assert.match(html, /agr-snapshot" content="2026-11-08"/);
  assert.match(html, /og:image" content="https:\/\/3f343\.com\/assets\/outpace\.png"/);
  assert.match(html, /href="\/en\/browser-ai-games\/"/);
  assert.doesNotMatch(html, /e\("#entries"\)\.innerHTML/);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = json["@graph"].find((item) => item["@type"] === "ItemList");
  assert.deepEqual(
    list.itemListElement.map((item) => item.name),
    ["Nappy", "PopBomb Arena", "Neon Protocol: Uprising", "Outpace"]
  );
  assert.equal(list.itemListElement[0].url, "https://3f343.com/en/games/nappy-1315/");
  assert.match(html, /id="entries">[\s\S]*nappy-1315/);
  assert.match(html, /not a completed playtest/);
});

test("Chinese homepage uses the catalog date and Chinese descriptions", () => {
  const html = refreshHomepage(fakeHome("zh"), catalog, "zh");
  assert.match(html, /正式目录更新 · 2026-11-08/);
  assert.match(html, /浏览器 2\.5D 城市散步/);
  assert.match(html, /href="\/zh\/games\/nappy-1315\/"/);
  assert.doesNotMatch(html, /当前目录 1,243/);
  assert.match(html, /不是完整试玩/);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = json["@graph"].find((item) => item["@type"] === "ItemList");
  assert.equal(list.itemListElement[0].url, "https://3f343.com/zh/games/nappy-1315/");
});

test("discovery page lists only catalog demo URLs and does not claim playtests", () => {
  const html = renderDiscoveryPage(catalog);
  assert.equal(browserEntries(catalog).length, 4);
  assert.match(html, /rel="canonical" href="https:\/\/3f343\.com\/en\/browser-ai-games\/"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /Listed demo/);
  assert.match(html, /not a completed playtest/);
  assert.match(html, /href="https:\/\/nappy\.josuakrause\.com\/"/);
  assert.match(html, /href="\/en\/games\/popbomb-arena-1314\/"/);
  assert.doesNotMatch(html, /AggregateRating|Review"|playable games|no signup|free to play/i);
  const data = JSON.parse(html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data["@type"], "CollectionPage");
  assert.equal(data.mainEntity.itemListElement.length, 4);
  assert.equal(data.mainEntity.itemListElement[0].url, "https://3f343.com/en/games/nappy-1315/");
});

test("related links keep an existing rich head and enrich a thin page", () => {
  const rich = `<!doctype html><html lang="en"><head><title>Outpace | AI Game Radar</title><link rel="canonical" href="https://3f343.com/en/games/outpace-346/"><link rel="alternate" hreflang="zh-CN" href="https://3f343.com/zh/games/outpace-346/"><meta property="og:title" content="Outpace | AI Game Radar"><script type="application/ld+json">{"@type":"VideoGame","name":"Outpace"}</script></head><body><main><p>Screenshots, playable demo and source of Outpace.</p></main></body></html>`;
  assert.equal(isEstablishedRich(rich), true);
  const updated = withRelatedLinks(rich, catalog.games[0], catalog.games, "en");
  assert.match(updated, /og:title" content="Outpace \| AI Game Radar"/);
  assert.match(updated, /Screenshots, playable demo and source of Outpace\./);
  assert.match(updated, /id="catalog-related"/);
  assert.match(updated, /href="\/en\/games\/nappy-1315\/"/);
  assert.match(updated, /href="\/en\/browser-ai-games\/"/);
  assert.equal(updated, withRelatedLinks(updated, catalog.games[0], catalog.games, "en"));

  const thin = `<!doctype html><html lang="en"><head><title>Nappy | 3F343</title><link rel="canonical" href="https://3f343.com/en/games/nappy-1315/"></head><body><main><h1>Nappy</h1><p>Browser 2.5D city stroll with a pram.</p></main></body></html>`;
  const richThin = withRelatedLinks(thin, catalog.games[3], catalog.games, "en");
  assert.deepEqual(missingRichTags(richThin), []);
  assert.match(richThin, /Browser 2\.5D city stroll with a pram\./);
  assert.match(richThin, /id="catalog-related"/);
});

test("counts helper refuses a stats mismatch", () => {
  assert.equal(countsFrom(catalog).games, 4);
  assert.throws(() => refreshHomepage(fakeHome("en"), { ...catalog, stats: { ...catalog.stats, games: 9 } }, "en"));
});
