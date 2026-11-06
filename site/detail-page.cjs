"use strict";

/**
 * Detail-page SEO for 3F343.
 *
 * Live pages are pre-rendered. The Vercel project `3f343-home-refresh`
 * only unpacks pages.json.gz (see that deploy's src/build.cjs); it does
 * not build the <head>. Two templates are already in the bundle:
 *
 * - RICH (example: /en/games/outpace-346/): "| AI Game Radar", meta
 *   description, hreflang, absolute og:title/url/image, VideoGame JSON-LD,
 *   Google verification, gtag, Vercel Web Analytics.
 * - THIN (example: /en/games/gitche-gumee-1299/, bloom-hop-1282, and many
 *   older ids that never got the rich pass): "| 3F343" plus a canonical
 *   link. A short-lived mid template (around ids 1215–1243) added a
 *   description, hreflang, and sometimes JSON-LD, but not Open Graph, and
 *   sometimes cut the description mid-word.
 *
 * New listing generation must call renderDetailPage(). Backfill existing
 * HTML with upgradeDetailHtml() so the visible copy stays as published.
 * This module does not write robots.txt or sitemap.xml.
 */

const ORIGIN = "https://3f343.com";
const SITE_NAME = "AI Game Radar";
const VERIFICATION = "45VKf_y525J7d9W4LulhLwnytmSa62E-6Z3g2gepqrk";
const GA_ID = "G-GG5ZLH0CMT";

const PLACEHOLDERS = new Set([
  "No description in the original catalog.",
  "原目录暂无详细说明。",
]);

const DEFAULT_STYLE =
  "<style>body{margin:0;background:#090b10;color:#f4f2ee;font:16px/1.65 system-ui}main{max-width:950px;padding:24px;margin:auto}a{color:#efb767;overflow-wrap:anywhere}img{max-width:100%;height:auto}h1{overflow-wrap:anywhere}</style>";

const CONSENT_EN = `<div id="consent" class="consent" style="display:none">We use basic Vercel statistics; Google Analytics is optional.<div><button id="agree">Allow analytics</button><button id="reject">Essentials only</button></div></div><script>(function(){const e=document.getElementById('consent'),v=localStorage.getItem('agr_analytics');if(v==='yes'){gtag('consent','update',{analytics_storage:'granted'})}else if(v!=='no'){e.style.display='block'}document.getElementById('agree').onclick=()=>{localStorage.setItem('agr_analytics','yes');gtag('consent','update',{analytics_storage:'granted'});e.remove()};document.getElementById('reject').onclick=()=>{localStorage.setItem('agr_analytics','no');e.remove()}})();</script>`;

const CONSENT_ZH = `<div id="consent" class="consent" style="display:none">本站使用 Vercel 基础统计；你可以选择是否同意 Google Analytics。<div><button id="agree">同意分析</button><button id="reject">仅基础统计</button></div></div><script>(function(){const e=document.getElementById('consent'),v=localStorage.getItem('agr_analytics');if(v==='yes'){gtag('consent','update',{analytics_storage:'granted'})}else if(v!=='no'){e.style.display='block'}document.getElementById('agree').onclick=()=>{localStorage.setItem('agr_analytics','yes');gtag('consent','update',{analytics_storage:'granted'});e.remove()};document.getElementById('reject').onclick=()=>{localStorage.setItem('agr_analytics','no');e.remove()}})();</script>`;

function escAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function absoluteUrl(value, origin = ORIGIN) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return "https:" + raw;
  if (raw.startsWith("/")) return origin + raw;
  return "";
}

function pageUrl(locale, slug, origin = ORIGIN) {
  const loc = locale === "zh" ? "zh" : "en";
  return `${origin}/${loc}/games/${slug}/`;
}

function htmlLang(locale) {
  return locale === "zh" ? "zh-CN" : "en";
}

function boilerplate(name, locale) {
  if (locale === "zh") return `查看 ${name} 的实机图、试玩和源码。`;
  return `Screenshots, playable demo and source of ${name}.`;
}

function cjkCount(value) {
  return (String(value).match(/[\u4e00-\u9fff]/g) || []).length;
}

function isFeatureTag(value) {
  return /^(玩法：|技术：)/.test(value);
}

function isCutOff(short, long) {
  if (short === long || long.length < short.length + 8) return false;
  if (long.startsWith(short)) return true;
  const stem = short.replace(/\s+\S{0,16}$/, "").trim();
  return stem.length >= 40 && long.startsWith(stem);
}

function isUsableDescription(value, locale) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || PLACEHOLDERS.has(text) || isFeatureTag(text)) return false;
  if ([...text].length < 24) return false;
  const ratio = cjkCount(text) / text.length;
  if (locale === "zh") return ratio >= 0.15 || cjkCount(text) >= 4;
  return ratio < 0.12;
}

function firstParagraph(html) {
  const body = String(html || "").split(/<body\b/i)[1] || "";
  const match = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return match ? stripTags(match[1]) : "";
}

function existingMetaDescription(html) {
  const match = String(html || "").match(
    /<meta\b[^>]*name=["']description["'][^>]*>/i
  );
  if (!match) return "";
  const content = match[0].match(/content=["']([\s\S]*?)["']/i);
  return content ? stripTags(content[1]) : "";
}

function chooseDescription(game, locale, html) {
  const name = (game && game.name) || nameFromHtml(html) || "Game";
  const catalogText =
    locale === "zh"
      ? (game && (game.descriptionZh || "")) || ""
      : (game && (game.description || "")) || "";
  const candidates = [
    existingMetaDescription(html),
    firstParagraph(html),
    catalogText,
  ]
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter((item) => isUsableDescription(item, locale));

  const unique = [];
  for (const item of candidates) {
    if (!unique.includes(item)) unique.push(item);
  }
  const kept = unique.filter((item) => !unique.some((other) => isCutOff(item, other)));
  if (kept.length) {
    return kept.sort((a, b) => b.length - a.length)[0];
  }
  return boilerplate(name, locale);
}

function firstImage(html) {
  const body = String(html || "").split(/<body\b/i)[1] || String(html || "");
  const match = body.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]) : "";
}

function chooseImage(game, html) {
  const fromPage = absoluteUrl(firstImage(html));
  if (fromPage) return fromPage;
  return absoluteUrl(game && game.image);
}

function nameFromHtml(html) {
  const h1 = String(html || "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = stripTags(h1[1]).replace(/\s*\|\s*AI Game Radar\s*$/, "").trim();
    if (text) return text;
  }
  const title = String(html || "").match(/<title>([\s\S]*?)<\/title>/i);
  if (!title) return "";
  return stripTags(title[1])
    .replace(/\s*\|\s*(AI Game Radar|3F343)\s*$/, "")
    .trim();
}

function slugFromHtml(html) {
  const match = String(html || "").match(
    /rel=["']canonical["'][^>]*href=["']https:\/\/3f343\.com\/(?:en|zh)\/games\/([^/"']+)\//i
  );
  if (match) return match[1];
  const href = String(html || "").match(
    /href=["']https:\/\/3f343\.com\/(?:en|zh)\/games\/([^/"']+)\//i
  );
  return href ? href[1] : "";
}

function sameAsLinks(game) {
  const values = [game && game.github, game && game.demo, game && game.sourceUrl];
  const seen = new Set();
  const links = [];
  for (const value of values) {
    const url = absoluteUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push(url);
  }
  return links;
}

function stylesFromHtml(html) {
  const head = String(html || "").split(/<\/head>/i)[0] || "";
  const styles = head.match(/<style\b[\s\S]*?<\/style>/gi);
  return styles && styles.length ? styles.join("") : DEFAULT_STYLE;
}

function robotsFromHtml(html) {
  const head = String(html || "").split(/<\/head>/i)[0] || "";
  const match = head.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i);
  return match ? match[0] : "";
}

function jsonLd(game, locale, description, image, url) {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description,
    url,
  };
  if (image) data.image = image;
  const sameAs = sameAsLinks(game);
  if (sameAs.length) data.sameAs = sameAs;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function renderHead({ game, locale, description, image, style, robots }) {
  const slug = game.slug;
  const name = game.name;
  const url = pageUrl(locale, slug);
  const en = pageUrl("en", slug);
  const zh = pageUrl("zh", slug);
  const title = `${name} | ${SITE_NAME}`;
  const tags = [
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
    robots || "",
    `<title>${escText(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}">`,
    `<meta name="google-site-verification" content="${VERIFICATION}">`,
    `<link rel="canonical" href="${escAttr(url)}">`,
    `<link rel="alternate" hreflang="en" href="${escAttr(en)}">`,
    `<link rel="alternate" hreflang="zh-CN" href="${escAttr(zh)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escAttr(en)}">`,
    "<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">",
    "<link rel=\"alternate\" href=\"/feeds/latest.xml\" type=\"application/rss+xml\" title=\"3F343 latest\">",
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${escAttr(url)}">`,
    image ? `<meta property="og:image" content="${escAttr(image)}">` : "",
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});</script>",
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
    `<script>gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true})</script>`,
    "<script defer src=\"/_vercel/insights/script.js\"></script>",
    style || DEFAULT_STYLE,
    jsonLd(game, locale, description, image, url),
  ];
  return `<head>${tags.filter(Boolean).join("")}</head>`;
}

function withConsent(body, locale) {
  if (/id=["']consent["']/.test(body) || /agr_analytics/.test(body)) return body;
  const block = locale === "zh" ? CONSENT_ZH : CONSENT_EN;
  if (/<\/body>/i.test(body)) return body.replace(/<\/body>/i, `${block}</body>`);
  return body + block;
}

function gameFromHtml(html, locale, partial) {
  const base = partial || {};
  const slug = base.slug || slugFromHtml(html);
  const name = base.name || nameFromHtml(html) || slug;
  return Object.assign({}, base, { slug, name });
}

function upgradeDetailHtml(html, game, locale) {
  const loc = locale === "zh" ? "zh" : "en";
  const resolved = gameFromHtml(html, loc, game);
  if (!resolved.slug || !resolved.name) {
    throw new Error("Detail page is missing a slug or name");
  }
  const description = chooseDescription(resolved, loc, html);
  const image = chooseImage(resolved, html);
  const head = renderHead({
    game: resolved,
    locale: loc,
    description,
    image,
    style: stylesFromHtml(html),
    robots: robotsFromHtml(html),
  });
  const bodyMatch = String(html).match(/<body\b[\s\S]*$/i);
  const body = withConsent(bodyMatch ? bodyMatch[0] : "<body></body></html>", loc);
  return `<!doctype html><html lang="${htmlLang(loc)}">${head}${body}`;
}

function renderDetailPage(game, locale) {
  if (!game || !game.slug || !game.name) throw new Error("Game slug and name are required");
  const loc = locale === "zh" ? "zh" : "en";
  const description = chooseDescription(game, loc, "");
  const image = chooseImage(game, "");
  const head = renderHead({
    game,
    locale: loc,
    description,
    image,
    style: DEFAULT_STYLE,
    robots: "",
  });
  const home = loc === "zh" ? "/zh/" : "/en/";
  const other = loc === "zh" ? pageUrl("en", game.slug).replace(ORIGIN, "") : pageUrl("zh", game.slug).replace(ORIGIN, "");
  const otherLabel = loc === "zh" ? "English" : "中文";
  const catalogLabel = loc === "zh" ? "收录日期" : "Cataloged";
  const sourceLabel = loc === "zh" ? "开发者源码" : "Developer source";
  const playLabel = loc === "zh" ? "试玩" : "Play demo";
  const licenseLabel = loc === "zh" ? "截图许可与署名" : "Screenshot license and attribution";
  const disclaimer =
    loc === "zh"
      ? "试玩核验范围见条目证据记录，并非完整通关。"
      : "Demo verification scope is recorded in the entry evidence; it is not a full playthrough.";
  const when = game.addedOn || game.verifiedOn || "";
  const models = Array.isArray(game.models) ? game.models.filter(Boolean).join(" · ") : "";
  const tech = Array.isArray(game.tech) ? game.tech.filter(Boolean).join(" · ") : "";
  const parts = [
    `<a href="${home}">3F343</a> · <a href="${escAttr(other)}">${otherLabel}</a>`,
    `<h1>${escText(game.name)}</h1>`,
    `<p>${escText(description)}</p>`,
  ];
  if (when || models) {
    parts.push(`<p>${escText(catalogLabel)}: ${escText([when, models].filter(Boolean).join(" · "))}</p>`);
  }
  if (tech) parts.push(`<p>${escText(tech)}</p>`);
  if (image) {
    parts.push(`<img src="${escAttr(image)}" alt="${escAttr(game.name)}">`);
    const media = image.match(/\/media\/([^/]+)$/);
    if (media) {
      const file = media[1].replace(/\.[^.]+$/, "");
      parts.push(`<p><a href="/media/${escAttr(file)}-LICENSE.txt">${licenseLabel}</a></p>`);
    }
  }
  const links = [];
  if (absoluteUrl(game.github)) {
    links.push(`<a href="${escAttr(absoluteUrl(game.github))}">${sourceLabel}</a>`);
  }
  if (absoluteUrl(game.demo)) {
    links.push(`<a href="${escAttr(absoluteUrl(game.demo))}">${playLabel}</a>`);
  }
  if (links.length) parts.push(`<p>${links.join(" · ")}</p>`);
  parts.push(`<small>${disclaimer}</small>`);
  const body = withConsent(`<body><main>${parts.join("")}</main></body></html>`, loc);
  return `<!doctype html><html lang="${htmlLang(loc)}">${head}${body}`;
}

function absolutizeOgImages(html, origin = ORIGIN) {
  return String(html).replace(/<meta\b[^>]*>/gi, (tag) => {
    if (!/property\s*=\s*["']og:image["']/i.test(tag)) return tag;
    return tag.replace(/content\s*=\s*(["'])([^"']*)\1/i, (full, quote, url) => {
      if (/^https?:\/\//i.test(url)) return full;
      if (url.startsWith("/")) return `content=${quote}${origin}${url}${quote}`;
      return full;
    });
  });
}

function missingRichTags(html) {
  const head = String(html).split(/<\/head>/i)[0];
  const missing = [];
  const expect = [
    [/name=["']description["']/i, "description"],
    [/rel=["']canonical["'][^>]*https:\/\/3f343\.com\//i, "canonical"],
    [/hreflang=["']en["']/i, "hreflang-en"],
    [/hreflang=["']zh-CN["']/i, "hreflang-zh-CN"],
    [/hreflang=["']x-default["']/i, "hreflang-x-default"],
    [/property=["']og:title["']/i, "og:title"],
    [/property=["']og:description["']/i, "og:description"],
    [/property=["']og:url["'][^>]*https:\/\/3f343\.com\//i, "og:url"],
    [/application\/ld\+json[\s\S]*VideoGame/i, "jsonld-videogame"],
    [/\/_vercel\/insights\/script\.js/i, "vercel-insights"],
  ];
  for (const [pattern, label] of expect) {
    if (!pattern.test(head)) missing.push(label);
  }
  const image = head.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (image && !/^https?:\/\//i.test(image[1])) missing.push("og:image-absolute");
  if (/twitter:card/i.test(head)) missing.push("unexpected-twitter");
  return missing;
}

function indexGames(catalog) {
  const games = new Map();
  const list = Array.isArray(catalog) ? catalog : (catalog && catalog.games) || [];
  for (const game of list) {
    if (game && game.slug) games.set(game.slug, game);
  }
  return games;
}

module.exports = {
  ORIGIN,
  absoluteUrl,
  absolutizeOgImages,
  boilerplate,
  chooseDescription,
  chooseImage,
  indexGames,
  missingRichTags,
  pageUrl,
  renderDetailPage,
  upgradeDetailHtml,
};
