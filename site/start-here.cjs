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
  "(?:desktop and phone support|兼顾桌面与手机|面向手机|mobile landscape|Phone browser|手机浏览器)";
const COMPANION_SOURCE = "(?:phone join codes|手机加码)";
const RUNTIME_SOURCE =
  "(?:\\bwebgpu\\b|requires installing|install required|no browser demo|需安装|需要安装|原生 WebGPU)";
const EARLY_SOURCE = "(?:wireframe|not yet a full|线框|还不是完整)";
const HANDS_OFF_SOURCE = "(?:hands-off|camera flies|no steering|镜头自行|放手飞行|没有方向舵)";
const ARCADE_SOURCE = "(?:\\barcade\\b|fruit-slic|swipe to slice|切水果|街机)";
const EXPLORE_SOURCE = "(?:\\b3d\\b|first-person|第一人称)";
const DURATION_SOURCE =
  "(?:about ten minutes|\\bten minutes\\b|one-sitting run|one-sitting|one sitting|~\\s*1\\s*hour|\\b\\d+\\s*(?:minutes|minute|hours|hour)\\b|约十分钟|约一小时|一局走完)";

const SHORT_RE = new RegExp(SHORT_SOURCE, "i");
const PHONE_RE = new RegExp(PHONE_SOURCE, "i");
const COMPANION_RE = new RegExp(COMPANION_SOURCE, "i");
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
    lead: "Selected from public catalog text. Not playtested one by one.",
    demo: "Play",
    page: "Details",
    source: "Source",
    intentLead: "Filter by the play the catalog describes.",
    emptyIntent: "No catalog entries match these fields.",
    emptySearch: "No matching games. Try another search or filter.",
    fitTitle: "Is this for you?",
    back: "Back to Start here",
    topic: "Browser AI games",
    relatedTitle: "Other catalog entries",
    relatedNote: "Neighboring catalog ids. This list is not a recommendation.",
    chips: [
      ["browser", "Open in the browser now"],
      ["still", "Has a gameplay still"],
      ["sourced", "Source available"],
      ["short", "Short session"],
      ["phone", "Play on a phone"],
      ["runtime", "Needs a desktop or special runtime"],
    ],
    slots: {
      arcade: "Arcade",
      short: "Short sitting",
      phone: "Phone",
      explore: "First person",
      runtime: "Puzzle",
      caveat: "Early build",
    },
  },
  zh: {
    nav: "先体验",
    kicker: "先体验",
    heading: "先从这几款里挑一款",
    lead: "基于公开资料筛选，未逐款完整试玩。",
    demo: "试玩",
    page: "介绍",
    source: "源码",
    intentLead: "按目录里写明的玩法筛。",
    emptyIntent: "没有目录条目匹配这些字段。",
    emptySearch: "没有匹配结果，请调整关键词或筛选条件。",
    fitTitle: "这款适合谁",
    back: "返回先体验",
    topic: "浏览器 AI 游戏（英文）",
    relatedTitle: "其他目录条目",
    relatedNote: "相邻的目录编号，不是推荐。",
    chips: [
      ["browser", "现在就在浏览器打开"],
      ["still", "有实机图"],
      ["sourced", "有可查看来源"],
      ["short", "短时长"],
      ["phone", "手机上能玩"],
      ["runtime", "需要桌面或特殊环境"],
    ],
    slots: {
      arcade: "街机",
      short: "短局",
      phone: "手机",
      explore: "第一人称",
      runtime: "解谜",
      caveat: "早期版本",
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

function isPhonePlay(game) {
  const text = blob(game);
  if (COMPANION_RE.test(text)) return false;
  return PHONE_RE.test(text);
}

function isRailPhone(game) {
  if (!isPhonePlay(game) || isHandsOff(game)) return false;
  return !/hub of little games|小游戏合集|\bage 5\b|五岁/.test(blob(game));
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

function playerAdvice(game, locale) {
  const text = blob(game);
  const zh = locale === "zh";
  if (/swipe to slice|切水果|滑动切开/.test(text)) {
    return zh
      ? { hook: "滑动切水果，连击，躲开炸弹。", fit: "适合想玩滑动连击街机的人。" }
      : { hook: "Swipe to slice fruit, chain combos, and dodge bombs.", fit: "For a swipe-combo arcade." };
  }
  if (/about ten minutes|约十分钟/.test(text)) {
    return zh
      ? {
          hook: "沙漠平台跳跃，从 Dry Creek 走到 Dust King。",
          fit: "适合想用很短时间打完一局平台跳跃的人。",
          gate: "约十分钟。",
        }
      : {
          hook: "Desert platformer, from Dry Creek to the Dust King.",
          fit: "For a platformer you can finish in one short sitting.",
          gate: "About ten minutes.",
        };
  }
  if (/one-sitting|一局走完/.test(text)) {
    return zh
      ? {
          hook: "重走 Edmund Fitzgerald 的最后航程，先看海图再掌舵。",
          fit: "适合想一局走完的航海。",
          gate: "目录写明一局走完。",
        }
      : {
          hook: "Sail the Edmund Fitzgerald’s last voyage, chart then helm.",
          fit: "For one sitting of sailing.",
          gate: "The catalog calls it a one-sitting run.",
        };
  }
  if (/return the diamond|归还钻石/.test(text)) {
    return zh
      ? {
          hook: "躲开守卫，熄灯藏身，黎明前归还钻石。",
          fit: "适合想在桌面或手机上玩宫殿潜行的人。",
        }
      : {
          hook: "Slip past guards, snuff lanterns, and return the diamond before dawn.",
          fit: "For palace stealth on a desktop or a phone.",
        };
  }
  if (/three holograms|三个全息|黄金小牛/.test(text)) {
    return zh
      ? { hook: "用对的毛皮填满三个全息轮廓，让三头牛活过来。", fit: "适合想玩第一人称方块解谜的人。" }
      : {
          hook: "Fill three holograms with the right hide and bring three cows to life.",
          fit: "For a first-person puzzle in a small block world.",
        };
  }
  if (/webgpu/i.test(text)) {
    return zh
      ? {
          hook: "把符文镶进石坛，让闪电给机器充能。",
          fit: "适合想玩宝石电路解谜的人。",
          gate: "约一小时，而且要能开原生 WebGPU。",
        }
      : {
          hook: "Set runes so a captured bolt charges dead machines.",
          fit: "For a gem-circuit puzzle.",
          gate: "About an hour, and it needs raw WebGPU.",
        };
  }
  if (/wireframe|线框/.test(text)) {
    return zh
      ? {
          hook: "在山谷里走，卫兵会看见你、听见你。",
          fit: "适合想玩第一人称潜行的人。",
          gate: "画面刻意是线框，这一版还不是完整任务。",
        }
      : {
          hook: "Walk a valley where the guards can see and hear you.",
          fit: "For first-person stealth.",
          gate: "Wireframe on purpose, and not a full mission yet.",
        };
  }
  if (isPhonePlay(game)) {
    const play = firstSentence(localeText(game, locale)).split(/Browser game with|浏览器可玩/)[0].trim();
    return zh
      ? { hook: play, fit: "适合想在桌面或手机上打开的人。", gate: "目录写明可以在手机上玩。" }
      : { hook: play, fit: "For opening this on a desktop or a phone.", gate: "The catalog says it supports a phone." };
  }
  return { hook: firstSentence(localeText(game, locale)), fit: "", gate: "" };
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
    phone: take(pool, used, isRailPhone),
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
  if (mode === "phone") return isPhonePlay(game);
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
  const advice = playerAdvice(game, locale);
  const page = `/${locale}/games/${game.slug}/`;
  const img = imageUrl(game);
  const media = img
    ? `<a class="start-thumb" href="${esc(page)}"><img src="${esc(img)}" alt=""></a>`
    : "";
  const gate = advice.gate ? `<p class="start-gate">${esc(advice.gate)}</p>` : "";
  const source = game.github
    ? `<a class="start-source" href="${esc(game.github)}" target="_blank" rel="noopener">${esc(copy.source)}</a>`
    : "";
  return `<article class="start-card" data-slot="${esc(pick.slot)}" data-slug="${esc(game.slug)}"><div class="start-body"><p class="start-slot">${esc(copy.slots[pick.slot])}</p><h3><a href="${esc(page)}">${esc(game.name)}</a></h3><p class="start-hook">${esc(advice.hook)}</p><p class="start-fit">${esc(advice.fit)}</p>${gate}<p class="start-actions">${game.demo ? `<a class="start-demo" href="${esc(game.demo)}" target="_blank" rel="noopener">${esc(copy.demo)}</a>` : ""}<a href="${esc(page)}">${esc(copy.page)}</a>${source}</p></div>${media}</article>`;
}

function renderRail(picks, locale) {
  const copy = COPY[locale];
  return `<section id="start" aria-labelledby="start-heading"><h2 id="start-heading">${esc(copy.heading)}</h2><p class="start-lead">${esc(copy.lead)}</p><div class="start-grid">${picks.map((pick) => renderCard(pick, locale)).join("")}</div></section>`;
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
function intentMatch(g,mode){const t=catalogBlob(g);if(mode==="all")return true;if(mode==="screens"||mode==="still")return g.mediaType==="gameplay";if(mode==="play"||mode==="browser")return !!g.demo;if(mode==="source")return !!g.github;if(mode==="sourced")return !!(g.github||g.sourceVerified);if(mode==="short")return /${SHORT_SOURCE}/i.test(t);if(mode==="phone")return !/${COMPANION_SOURCE}/i.test(t)&&/${PHONE_SOURCE}/i.test(t);if(mode==="runtime")return ["install","requires-installation-or-source","local-browser","emulator"].includes(g.accessType||"")||/${RUNTIME_SOURCE}/i.test(t);return true}
function emptyCatalogMessage(){if(mode==="short"||mode==="phone"||mode==="runtime"||mode==="browser"||mode==="still"||mode==="sourced")return ${JSON.stringify(copy.emptyIntent)};return ${JSON.stringify(copy.emptySearch)};}`;
}

const START_CSS = `<style id="start-here">#start{margin:8px 0 0;padding:0}#start h2{margin:0 0 4px;font-size:clamp(26px,4vw,34px);letter-spacing:-.04em}#start .start-lead{margin:0 0 10px;color:#efb767;font-size:13px}#start .start-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#start .start-card{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:10px;align-items:start;min-width:0;background:#141923;border:1px solid #293340;border-radius:12px;padding:10px 12px}#start .start-thumb img{width:92px;height:68px;object-fit:cover;border-radius:8px;background:#263348;display:block}#start .start-slot{margin:0;color:#efb767;font-size:11px;font-weight:700}#start h3{margin:1px 0 4px;font-size:18px;line-height:1.15}#start .start-hook{margin:0 0 4px;font-size:14px;line-height:1.35}#start .start-fit{margin:0 0 4px;font-size:14px;font-weight:700;line-height:1.35}#start .start-gate{margin:0 0 6px;color:#d7c49a;font-size:12px;line-height:1.35}#start .start-actions{display:flex;flex-wrap:wrap;gap:8px 10px;margin:6px 0 0;align-items:center}#start .start-actions a{font-size:13px}#start .start-demo{background:#fff;color:#111;border-radius:8px;padding:6px 10px;font-weight:700}#start .start-source{color:#9aa8b7;font-size:12px}#intent{margin:0 0 10px}#intent .caption{margin:0 0 8px}#intent .filters{margin-bottom:0}@media(max-width:800px){#start .start-grid{grid-template-columns:1fr}}@media(max-width:720px){header{height:auto;align-items:flex-start;flex-wrap:wrap;padding:8px 0}header nav{display:flex;flex-wrap:wrap;gap:8px 12px;width:100%}#start .start-card{grid-template-columns:minmax(0,1fr) 76px;padding:8px 10px}#start .start-thumb img{width:76px;height:56px}}</style>`;

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
  const advice = playerAdvice(game, locale);
  const gate = advice.gate ? `<p class="start-gate">${esc(advice.gate)}</p>` : "";
  return `<aside id="fit"><h2>${esc(copy.fitTitle)}</h2><p class="start-hook">${esc(advice.hook)}</p><p class="start-fit">${esc(advice.fit)}</p>${gate}<p class="start-lead">${esc(copy.lead)}</p><p><a href="/${locale}/#start">${esc(copy.back)}</a> · <a href="/en/games/browser-ai-games/">${esc(copy.topic)}</a></p></aside>`;
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
  const block = fitBlock(game, pick, locale);
  let next = html;
  if (next.includes("</h1>")) next = next.replace("</h1>", "</h1>" + block);
  else throw new Error("Detail insertion point missing for " + game.slug);
  if (!next.includes('id="catalog-related"') && next.includes("</main>")) {
    next = next.replace("</main>", neighborBlock(game, games, locale) + "</main>");
  }
  const style =
    "<style>aside#fit{margin:12px 0;padding:12px 14px;border:1px solid #efb767;border-radius:12px;background:#141923}aside#fit h2{margin:0 0 6px;font-size:22px}aside#fit .start-hook,aside#fit .start-fit,aside#fit .start-gate,aside#fit .start-lead{margin:0 0 6px}aside#fit .start-fit{font-weight:700}aside#fit .start-lead{color:#efb767;font-size:13px}#catalog-related{margin-top:18px}</style>";
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
  RUNTIME_RE,
  durationQuote,
  isHostedPlayable,
  isPhonePlay,
  isShortSession,
  isSpecialRuntime,
  matchesFilter,
  patchDetail,
  patchHomepage,
  playerAdvice,
  renderIntent,
  renderRail,
  selectStartHere,
};
