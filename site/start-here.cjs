"use strict";

/**
 * Homepage "Start here" rail and catalog-field intent chips.
 *
 * Selection and copy come from catalog fields and blurb wording.
 * This module does not read quality/visual, does not invent scores,
 * session lengths, device support, or playtests, and does not add routes.
 */

const HOSTED_ACCESS = new Set(["", "browser", "listed-public-browser-demo"]);
const SPECIAL_ACCESS = new Set([
  "install",
  "requires-installation-or-source",
  "local-browser",
  "emulator",
]);

const SHORT_SOURCE =
  "(?:one[- ]sitting|about ten minutes|\\bten minutes\\b|a few minutes|under \\d{1,2} minutes|\\b(?:[1-9]|1\\d|20) minutes\\b|约十分钟|一局走完|几分钟)";
const PHONE_SOURCE =
  "(?:\\bphone\\b|\\bmobile\\b|\\btouch\\b|\\bswipe\\b|\\bgyro(?:scope)?\\b|手机|触屏|触控|滑动|陀螺)";
const DEVICE_SOURCE =
  "(?:desktop and phone support|phone gyroscope controls|phone gyroscope|phone join codes|touch controls|兼顾桌面与手机|手机陀螺仪|手机加码|触控)";
const RUNTIME_SOURCE =
  "(?:\\bwebgpu\\b|requires installing|install required|no browser demo|需安装|需要安装|原生 WebGPU)";
const EARLY_SOURCE = "(?:wireframe|not yet a full|线框|还不是完整)";
const HANDS_OFF_SOURCE = "(?:hands-off|camera flies|镜头自行|放手飞行)";
const ARCADE_SOURCE = "(?:\\barcade\\b|fruit-slic|swipe to slice|切水果|街机)";
const EXPLORE_SOURCE = "(?:\\b3d\\b|first-person|第一人称)";
const DURATION_SOURCE =
  "(?:about ten minutes|\\bten minutes\\b|one-sitting run|one-sitting|one sitting|~\\s*1\\s*hour|\\b\\d+\\s*(?:minutes|minute|hours|hour)\\b|约十分钟|约一小时|一局走完)";

const SHORT_RE = new RegExp(SHORT_SOURCE, "i");
const PHONE_RE = new RegExp(PHONE_SOURCE, "i");
const DEVICE_RE = new RegExp(DEVICE_SOURCE, "i");
const RUNTIME_RE = new RegExp(RUNTIME_SOURCE, "i");
const EARLY_RE = new RegExp(EARLY_SOURCE, "i");
const HANDS_OFF_RE = new RegExp(HANDS_OFF_SOURCE, "i");
const ARCADE_RE = new RegExp(ARCADE_SOURCE, "i");
const EXPLORE_RE = new RegExp(EXPLORE_SOURCE, "i");
const DURATION_RE = new RegExp(DURATION_SOURCE, "i");

const SLOT_ORDER = ["arcade", "short", "phone", "explore", "runtime", "caveat"];

const COPY = {
  en: {
    nav: "Start here",
    kicker: "Start here",
    heading: "Try one of these first",
    lead:
      "A field sample of formal catalog entries that already have a listed demo and a gameplay still. The shapes differ so you can compare them. This is not a ranking, not a personal recommendation, and not a playtest.",
    whyLabel: "Why it’s here.",
    timeLabel: "Session length.",
    deviceLabel: "Device or controls.",
    skipLabel: "Might not suit you.",
    demo: "Listed demo ↗",
    page: "Catalog page",
    note: "Listed demo link, not a completed playtest.",
    noTime: "Catalog does not record a session length.",
    timeQuote: "Catalog wording: ",
    deviceQuote: "Catalog wording: ",
    skipQuote: "Catalog wording: ",
    webgpu: "Catalog wording: raw WebGPU.",
    fable:
      'If you want a licensed, listed demo from this mid-November Fable check, use the <a href="/en/games/fable-52-mid-november-2026/">field guide</a>. That page does not mean those titles were playtested.',
    intentLead:
      "If you want… Matched from catalog fields or wording, not a personal recommendation.",
    emptyIntent: "No catalog entries match these fields.",
    emptySearch: "No matching games. Try another search or filter.",
    fitTitle: "Is this for you?",
    fitVoice:
      "This summary follows the public catalog text. 3F343 is not claiming a review or a playtest.",
    catalogSays: "Catalog says.",
    back: "Back to Start here",
    topic: "Browser AI games",
    relatedTitle: "Other catalog entries",
    relatedNote: "Neighboring catalog ids. This list is not a recommendation.",
    chips: [
      ["browser", "Open in the browser now"],
      ["still", "Has a gameplay still"],
      ["sourced", "Source available"],
      ["short", "Short session"],
      ["phone", "Phone / touch"],
      ["runtime", "Needs a desktop or special runtime"],
    ],
    slots: {
      arcade: "Arcade shape",
      short: "Catalog already states a short session",
      phone: "Catalog mentions a phone or touch control",
      explore: "3D or first-person shape",
      runtime: "Catalog names a special runtime",
      caveat: "Catalog records an early or hands-off limit",
    },
  },
  zh: {
    nav: "先体验",
    kicker: "先体验",
    heading: "先从这几款里挑一款",
    lead:
      "下面是正式目录里已经有试玩链接和实机图的一组字段样本，用来对照不同玩法。不是排名，不是按个人记录推荐，也不是试玩结论。",
    whyLabel: "为什么出现在这里。",
    timeLabel: "时长。",
    deviceLabel: "设备或操作。",
    skipLabel: "可能不适合。",
    demo: "目录中的试玩链接 ↗",
    page: "目录页",
    note: "这是目录里的试玩链接，不是完整试玩。",
    noTime: "目录未记录时长。",
    timeQuote: "目录用语：",
    deviceQuote: "目录用语：",
    skipQuote: "目录用语：",
    webgpu: "目录用语：原生 WebGPU。",
    fable: "",
    intentLead: "按目的选。匹配目录字段或原文用词，不是个人推荐。",
    emptyIntent: "没有目录条目匹配这些字段。",
    emptySearch: "没有匹配结果，请调整关键词或筛选条件。",
    fitTitle: "这款适合谁",
    fitVoice: "这段说明沿用公开目录原文。3F343 不是在写评测，也不是在声称已经试玩。",
    catalogSays: "目录这样写。",
    back: "返回先体验",
    topic: "浏览器 AI 游戏（英文）",
    relatedTitle: "其他目录条目",
    relatedNote: "相邻的目录编号，不是推荐。",
    chips: [
      ["browser", "现在就在浏览器打开"],
      ["still", "有实机图"],
      ["sourced", "有可查看来源"],
      ["short", "短时长"],
      ["phone", "手机 / 触控"],
      ["runtime", "需要桌面或特殊环境"],
    ],
    slots: {
      arcade: "街机这种玩法",
      short: "目录已写明短时长",
      phone: "目录提到手机或触控",
      explore: "3D 或第一人称",
      runtime: "目录点明特殊运行环境",
      caveat: "目录写明早期或放手限制",
    },
  },
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blob(game) {
  return [game && game.description, game && game.descriptionZh].filter(Boolean).join("\n");
}

function localeText(game, locale) {
  if (locale === "zh" && game.descriptionZh) return game.descriptionZh;
  return game.description || game.descriptionZh || "";
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=[。．])\s*|(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstSentence(text) {
  const parts = splitSentences(text);
  return parts[0] || String(text || "").trim();
}

function newest(games) {
  return [...games].sort((a, b) => {
    const date = String(b.addedOn || "").localeCompare(String(a.addedOn || ""));
    if (date) return date;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function isShortSession(game) {
  return SHORT_RE.test(blob(game));
}

function isPhoneTouch(game) {
  return PHONE_RE.test(blob(game));
}

function isExplicitDevice(game) {
  return DEVICE_RE.test(blob(game));
}

function isSpecialRuntime(game) {
  const access = game.accessType || "";
  return SPECIAL_ACCESS.has(access) || RUNTIME_RE.test(blob(game));
}

function isEarlyCaveat(game) {
  return EARLY_RE.test(blob(game));
}

function isHandsOff(game) {
  return HANDS_OFF_RE.test(blob(game));
}

function isHostedPlayable(game) {
  if (!game || !game.demo || game.mediaType !== "gameplay") return false;
  return HOSTED_ACCESS.has(game.accessType || "");
}

function quoteMatch(text, regex) {
  const match = String(text).match(regex);
  return match ? match[0] : "";
}

function durationQuote(game, locale) {
  const primary = localeText(game, locale);
  const own = quoteMatch(primary, DURATION_RE);
  if (own) return own;
  const other = quoteMatch(blob(game), DURATION_RE);
  return other || "";
}

function deviceQuote(game, locale) {
  return quoteMatch(localeText(game, locale), DEVICE_RE);
}

function skipQuote(game, locale) {
  const text = localeText(game, locale);
  const sentence = splitSentences(text).find((part) => EARLY_RE.test(part) || HANDS_OFF_RE.test(part));
  if (sentence) return sentence;
  if (RUNTIME_RE.test(text) && /webgpu/i.test(text)) {
    return locale === "zh" ? "原生 WebGPU" : "raw WebGPU";
  }
  return "";
}

function whyHere(game, locale) {
  const zh = locale === "zh";
  const parts = [];
  if (game.demo) parts.push(zh ? "目录中的试玩链接" : "a listed demo URL");
  if (game.mediaType === "gameplay") {
    parts.push(zh ? "实机图（mediaType 为 gameplay）" : "a gameplay still (mediaType gameplay)");
  }
  if (game.github) parts.push(zh ? "源码链接" : "a source link");
  if (game.sourceVerified) {
    parts.push(zh ? "来源在目录中标为已核验" : "source marked verified in the catalog");
  }
  const joined = zh ? parts.join("、") : parts.join(", ");
  let line = zh
    ? `这条正式目录记录包含${joined}。`
    : `This formal catalog entry records ${joined}.`;
  if (game.license) {
    line += zh
      ? ` 目录记录的许可证：${game.license}。`
      : ` License recorded on the entry: ${game.license}.`;
  }
  return line;
}

function take(pool, used, predicate) {
  const hit = newest(pool.filter((game) => !used.has(game.slug) && predicate(game)))[0];
  if (!hit) return null;
  used.add(hit.slug);
  return hit;
}

function selectStartHere(games) {
  const pool = (games || []).filter(isHostedPlayable);
  const used = new Set();
  const picked = {
    arcade: take(pool, used, (game) => ARCADE_RE.test(blob(game))),
    short: take(pool, used, isShortSession),
    phone: take(pool, used, isExplicitDevice) || take(pool, used, isPhoneTouch),
    explore: take(
      pool,
      used,
      (game) =>
        EXPLORE_RE.test(blob(game)) &&
        !isShortSession(game) &&
        !isEarlyCaveat(game) &&
        !isHandsOff(game) &&
        !/webgpu/i.test(blob(game)),
    ),
    runtime: take(
      pool,
      used,
      (game) => /webgpu/i.test(blob(game)) || /原生 WebGPU/.test(blob(game)),
    ),
    caveat: take(pool, used, isEarlyCaveat) || take(pool, used, isHandsOff),
  };
  return SLOT_ORDER.filter((slot) => picked[slot]).map((slot) => ({
    slot,
    game: picked[slot],
  }));
}

function matchesFilter(game, mode) {
  if (mode === "all") return true;
  if (mode === "screens" || mode === "still") return game.mediaType === "gameplay";
  if (mode === "play" || mode === "browser") return Boolean(game.demo);
  if (mode === "source") return Boolean(game.github);
  if (mode === "sourced") return Boolean(game.github || game.sourceVerified);
  if (mode === "short") return isShortSession(game);
  if (mode === "phone") return isPhoneTouch(game);
  if (mode === "runtime") return isSpecialRuntime(game);
  return true;
}

function imageUrl(game) {
  const raw = String(game.image || "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return "https://3f343.com" + raw;
  return "";
}

function row(className, label, value) {
  if (!value) return "";
  return `<p class="${className}"><strong>${esc(label)}</strong> ${esc(value)}</p>`;
}

function renderCard(pick, locale) {
  const copy = COPY[locale];
  const game = pick.game;
  const hook = firstSentence(localeText(game, locale));
  const time = durationQuote(game, locale);
  const device = deviceQuote(game, locale);
  const skip = skipQuote(game, locale);
  const page = `/${locale}/games/${game.slug}/`;
  const img = imageUrl(game);
  const media = img
    ? `<a href="${esc(page)}"><img src="${esc(img)}" alt="${esc(game.name)}"></a>`
    : "";
  return `<article class="start-card" data-slot="${esc(pick.slot)}" data-slug="${esc(game.slug)}">${media}<div class="start-body"><p class="start-slot">${esc(copy.slots[pick.slot])}</p><h3><a href="${esc(page)}">${esc(game.name)}</a></h3><p class="start-hook">${esc(hook)}</p>${row("start-why", copy.whyLabel, whyHere(game, locale))}${row("start-time", copy.timeLabel, time ? copy.timeQuote + time : "")}${row("start-device", copy.deviceLabel, device ? copy.deviceQuote + device : "")}${row("start-skip", copy.skipLabel, skip ? copy.skipQuote + skip : "")}<p class="start-actions">${game.demo ? `<a class="start-demo" href="${esc(game.demo)}" target="_blank" rel="noopener">${esc(copy.demo)}</a>` : ""}<a href="${esc(page)}">${esc(copy.page)}</a></p><p class="start-note">${esc(copy.note)}</p></div></article>`;
}

function renderRail(picks, locale) {
  const copy = COPY[locale];
  const fable = copy.fable ? `<p class="start-fable">${copy.fable}</p>` : "";
  return `<section id="start" aria-labelledby="start-heading"><p class="start-kicker">${esc(copy.kicker)}</p><h2 id="start-heading">${esc(copy.heading)}</h2><p class="start-lead">${esc(copy.lead)}</p><div class="start-grid">${picks.map((pick) => renderCard(pick, locale)).join("")}</div>${fable}</section>`;
}

function renderIntent(locale) {
  const copy = COPY[locale];
  const buttons = copy.chips
    .map(([filter, label]) => `<button type="button" data-filter="${filter}">${esc(label)}</button>`)
    .join("");
  return `<div id="intent"><p class="caption">${esc(copy.intentLead)}</p><div class="filters" data-intent="field-match">${buttons}</div></div>`;
}

function filterScript(locale) {
  const copy = COPY[locale];
  return `function catalogBlob(g){return [g&&g.description,g&&g.descriptionZh].filter(Boolean).join("\\n")}
function intentMatch(g,mode){if(mode==="all")return true;if(mode==="screens"||mode==="still")return g.mediaType==="gameplay";if(mode==="play"||mode==="browser")return !!g.demo;if(mode==="source")return !!g.github;if(mode==="sourced")return !!(g.github||g.sourceVerified);if(mode==="short")return /${SHORT_SOURCE}/i.test(catalogBlob(g));if(mode==="phone")return /${PHONE_SOURCE}/i.test(catalogBlob(g));if(mode==="runtime")return ["install","requires-installation-or-source","local-browser","emulator"].includes(g.accessType||"")||/${RUNTIME_SOURCE}/i.test(catalogBlob(g));return true}
function emptyCatalogMessage(){if(mode==="short"||mode==="phone"||mode==="runtime"||mode==="browser"||mode==="still"||mode==="sourced")return ${JSON.stringify(copy.emptyIntent)};return ${JSON.stringify(copy.emptySearch)};}`;
}

const START_CSS = `<style id="start-here">#start{margin:22px 0 8px;padding:18px 16px 8px;border:1px solid #efb767;border-radius:16px;background:#141923}#start .start-kicker{margin:0;color:#efb767;font-size:11px;letter-spacing:.12em;font-weight:800;text-transform:uppercase}#start h2{margin:6px 0 8px;font-size:clamp(28px,4vw,40px);letter-spacing:-.04em}#start .start-lead,#start .start-fable,#intent .caption{color:#b7c3d1;font-size:14px}#start .start-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}#start .start-card{display:flex;flex-direction:column;min-width:0;background:#0e131b;border:1px solid #293340;border-radius:12px;overflow:hidden}#start .start-card img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#263348;display:block}#start .start-body{padding:12px 14px 14px}#start .start-slot{margin:0;color:#efb767;font-size:11px;font-weight:700}#start h3{margin:4px 0 8px;font-size:20px;line-height:1.2}#start .start-hook,#start .start-why,#start .start-time,#start .start-device,#start .start-skip,#start .start-note{margin:0 0 8px;font-size:13px;color:#d5dde6;overflow-wrap:anywhere}#start .start-note{color:#9aa8b7;font-size:12px}#start .start-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}#start .start-actions a{display:inline-block;padding:8px 10px;border-radius:8px;border:1px solid #4d5b6c;font-size:13px}#start .start-demo{background:#fff;color:#111;border-color:#fff;font-weight:700}#intent{margin:0 0 12px}#intent .filters{margin-bottom:0}@media(max-width:800px){#start .start-grid{grid-template-columns:1fr}#start{padding:14px 12px 4px}}@media(max-width:720px){header{height:auto;align-items:flex-start;flex-wrap:wrap;padding:10px 0}header nav{display:flex;flex-wrap:wrap;gap:8px 14px;width:100%}}</style>`;

function patchHomepage(html, picks, locale) {
  if (!COPY[locale]) throw new Error("Unknown locale " + locale);
  if (html.includes('id="start"')) return html;
  const copy = COPY[locale];
  const navNeedle = '<nav><a href="#fresh">';
  if (!html.includes(navNeedle)) throw new Error("Homepage nav anchor missing");
  let next = html.replace(navNeedle, `<nav><a href="#start">${copy.nav}</a><a href="#fresh">`);
  const diary = '<section id="catalog-increment-20261026"';
  if (!next.includes(diary)) throw new Error("Catalog diary anchor missing");
  next = next.replace(diary, renderRail(picks, locale) + diary);
  const list = '<div id="list" class="cards"';
  if (!next.includes(list)) throw new Error("Catalog list anchor missing");
  next = next.replace(list, renderIntent(locale) + list);
  const modeNeedle =
    '&&(mode==="all"||mode==="screens"&&g.mediaType==="gameplay"||mode==="play"&&g.demo||mode==="source"&&g.github))';
  if (!next.includes(modeNeedle)) throw new Error("Catalog filter expression missing");
  next = next.replace(modeNeedle, "&&intentMatch(g,mode))");
  const emptyNeedle =
    locale === "zh"
      ? 'e("#list").textContent="没有匹配结果，请调整关键词或筛选条件。"'
      : 'e("#list").textContent="No matching games. Try another search or filter."';
  if (!next.includes(emptyNeedle)) throw new Error("Empty catalog message missing");
  next = next.replaceAll(emptyNeedle, 'e("#list").textContent=emptyCatalogMessage()');
  const applyNeedle = "function apply(){";
  if (!next.includes(applyNeedle)) throw new Error("apply() missing");
  next = next.replace(applyNeedle, filterScript(locale) + applyNeedle);
  next = next.replace("||(b.visual||0)-(a.visual||0)", "");
  if (!next.includes("</head>")) throw new Error("head missing");
  next = next.replace("</head>", START_CSS + "</head>");
  return next;
}

function fitBlock(game, pick, locale) {
  const copy = COPY[locale];
  const hook = firstSentence(localeText(game, locale));
  const time = durationQuote(game, locale);
  const device = deviceQuote(game, locale);
  const skip = skipQuote(game, locale);
  const home = `/${locale}/#start`;
  const topic = "/en/games/browser-ai-games/";
  return `<aside id="fit"><h2>${esc(copy.fitTitle)}</h2><p>${esc(copy.fitVoice)}</p><p><strong>${esc(copy.catalogSays)}</strong> ${esc(hook)}</p>${row("start-why", copy.whyLabel, whyHere(game, locale))}<p><strong>${esc(copy.timeLabel)}</strong> ${esc(time ? copy.timeQuote + time : copy.noTime)}</p>${device ? row("start-device", copy.deviceLabel, copy.deviceQuote + device) : ""}${skip ? row("start-skip", copy.skipLabel, copy.skipQuote + skip) : ""}<p><a href="${esc(home)}">${esc(copy.back)}</a> · <a href="${esc(topic)}">${esc(copy.topic)}</a></p></aside>`;
}

function neighborBlock(game, games, locale) {
  const copy = COPY[locale];
  const sorted = [...games].filter((item) => item.slug && item.id != null).sort((a, b) => a.id - b.id);
  const index = sorted.findIndex((item) => item.slug === game.slug);
  if (index < 0) return "";
  const related = [];
  for (let step = 1; related.length < 4 && (index - step >= 0 || index + step < sorted.length); step += 1) {
    if (index - step >= 0) related.push(sorted[index - step]);
    if (related.length < 4 && index + step < sorted.length) related.push(sorted[index + step]);
  }
  if (!related.length) return "";
  const items = related
    .map((item) => `<li><a href="/${locale}/games/${esc(item.slug)}/">${esc(item.name)}</a></li>`)
    .join("");
  return `<nav id="catalog-related" aria-label="${esc(copy.relatedTitle)}"><p>${esc(copy.relatedTitle)}</p><p>${esc(copy.relatedNote)}</p><ul>${items}</ul><p><a href="/en/games/browser-ai-games/">${esc(copy.topic)}</a></p></nav>`;
}

function patchDetail(html, game, pick, games, locale) {
  if (html.includes('id="fit"')) return html;
  const marker = locale === "zh" ? "<p>收录日期:" : "<p>Cataloged:";
  const block = fitBlock(game, pick, locale);
  let next = html;
  if (next.includes(marker)) next = next.replace(marker, block + marker);
  else if (next.includes("</h1>")) next = next.replace("</h1>", "</h1>" + block);
  else throw new Error("Detail insertion point missing for " + game.slug);
  if (!next.includes('id="catalog-related"') && next.includes("</main>")) {
    next = next.replace("</main>", neighborBlock(game, games, locale) + "</main>");
  }
  const style =
    "<style>aside#fit{margin:16px 0;padding:14px 16px;border:1px solid #efb767;border-radius:12px;background:#141923}aside#fit h2{margin:0 0 8px;font-size:22px}#catalog-related{margin-top:18px}</style>";
  if (!next.includes('id="start-here-detail"')) {
    next = next.replace("</head>", style.replace("<style>", '<style id="start-here-detail">') + "</head>");
  }
  return next;
}

module.exports = {
  COPY,
  SLOT_ORDER,
  SHORT_RE,
  PHONE_RE,
  DEVICE_RE,
  RUNTIME_RE,
  durationQuote,
  isHostedPlayable,
  isPhoneTouch,
  isShortSession,
  isSpecialRuntime,
  matchesFilter,
  patchDetail,
  patchHomepage,
  renderIntent,
  renderRail,
  selectStartHere,
  skipQuote,
  whyHere,
};
