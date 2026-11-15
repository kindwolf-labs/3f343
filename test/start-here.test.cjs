"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const {
  isShortSession,
  matchesFilter,
  patchDetail,
  patchHomepage,
  selectStartHere,
} = require("../site/start-here.cjs");

const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "test/fixtures/catalog-2026-11-14.json");
const baseline = path.join(root, "baseline/live-2026-11-14");

function loadCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function game(slug, catalog) {
  return catalog.games.find((item) => item.slug === slug);
}

test("live catalog snapshot is still 1321 games dated 2026-11-14", () => {
  const catalog = loadCatalog();
  assert.equal(catalog.updatedOn, "2026-11-14");
  assert.equal(catalog.catalog_updated, "2026-11-14");
  assert.equal(catalog.games.length, 1321);
  assert.equal(catalog.stats.games, 1321);
  assert.equal(catalog.stats.demos, 742);
});

test("start here picks six hosted, evidenced shapes and skips install-only titles", () => {
  const catalog = loadCatalog();
  const picks = selectStartHere(catalog.games);
  assert.deepEqual(
    picks.map((pick) => pick.slot + ":" + pick.game.slug),
    [
      "arcade:pulp-panic-1320",
      "short:mirage-1301",
      "phone:topkapi-gecesi-1252",
      "explore:vaquitas-de-bloque-1321",
      "runtime:the-last-rune-1308",
      "caveat:sightline-1317",
    ],
  );
  for (const pick of picks) {
    assert.equal(pick.game.mediaType, "gameplay");
    assert.ok(pick.game.demo);
    assert.ok(!["install", "requires-installation-or-source", "local-browser", "emulator"].includes(pick.game.accessType));
  }
  assert.equal(
    picks.some((pick) => pick.game.slug === "sparkmine-1216"),
    false,
  );
});

test("short, phone, and runtime filters follow catalog wording only", () => {
  const catalog = loadCatalog();
  const slugs = (mode) =>
    catalog.games.filter((item) => matchesFilter(item, mode)).map((item) => item.slug);
  const short = slugs("short");
  assert.ok(short.includes("mirage-1301"));
  assert.ok(short.includes("gitche-gumee-1299"));
  assert.equal(short.includes("the-last-rune-1308"), false);
  assert.equal(short.includes("pulp-panic-1320"), false);
  assert.equal(short.includes("ai-horror-games-1253"), false);
  assert.ok(short.length < 15);
  assert.equal(isShortSession(game("the-last-rune-1308", catalog)), false);
  assert.equal(slugs("phone").includes("pulp-panic-1320"), false);
  assert.equal(slugs("phone").includes("quizlight-1303"), false);
  assert.equal(slugs("phone").includes("low-tide-1290"), false);
  assert.ok(slugs("phone").includes("kervan-1249"));
  assert.ok(slugs("phone").includes("topkapi-gecesi-1252"));
  assert.ok(slugs("runtime").includes("the-last-rune-1308"));
  assert.ok(slugs("runtime").includes("sparkmine-1216"));
  assert.equal(slugs("browser").length, 742);
});

test("patched homepages put the rail above the diary and keep the live counts", () => {
  const catalog = loadCatalog();
  const picks = selectStartHere(catalog.games);
  for (const locale of ["en", "zh"]) {
    const before = fs.readFileSync(path.join(baseline, locale, "index.html"), "utf8");
    const after = patchHomepage(before, picks, locale);
    const start = after.indexOf('id="start"');
    const diary = after.indexOf('id="catalog-increment-20261026"');
    assert.ok(start > 0 && diary > start);
    assert.equal(after.includes("1,321"), true);
    assert.equal(after.includes("2026-11-14"), true);
    assert.equal(
      after.includes("no complete playthrough is claimed") || after.includes("未宣称完成整局实机通关"),
      true,
    );
    assert.equal(after.includes("Outpace"), true);
    assert.equal(after.includes('href="#start"'), true);
    assert.equal(after.includes("quality"), false);
    assert.equal(after.includes("AgentsLoop"), false);
    assert.equal((after.match(/id="start"/g) || []).length, 1);
    const rail = after.slice(start, diary);
    assert.equal(rail.includes("pulp-panic-1320"), true);
    assert.equal(rail.includes("mirage-1301"), true);
    assert.equal(rail.includes("sightline-1317"), true);
    assert.equal(rail.includes("the-last-rune-1308"), true);
    assert.equal(/\b5-minute\b|五分钟/.test(rail), false);
    assert.match(rail, locale === "zh" ? /约十分钟/ : /about ten minutes/i);
    assert.match(rail, locale === "zh" ? /线框/ : /wireframe/i);
    assert.equal(rail.includes("mediaType"), false);
    assert.equal(rail.includes(locale === "zh" ? "适合想玩滑动连击街机的人" : "swipe-combo arcade"), true);
    assert.equal(rail.includes(locale === "zh" ? "基于公开资料筛选，未逐款完整试玩。" : "Not playtested one by one."), true);
    assert.equal((rail.match(/未逐款完整试玩|Not playtested one by one/g) || []).length, 1);
    assert.equal(rail.includes("quizlight") || rail.includes("phone join"), false);
    const again = patchHomepage(after, picks, locale);
    assert.equal(again, after);
  }
});

test("intent chips describe field matching and do not print scores", () => {
  const catalog = loadCatalog();
  const picks = selectStartHere(catalog.games);
  const en = patchHomepage(
    fs.readFileSync(path.join(baseline, "en/index.html"), "utf8"),
    picks,
    "en",
  );
  const zh = patchHomepage(
    fs.readFileSync(path.join(baseline, "zh/index.html"), "utf8"),
    picks,
    "zh",
  );
  assert.match(en, /Filter by the play the catalog describes/);
  assert.match(zh, /按目录里写明的玩法筛/);
  assert.match(en, /Play on a phone/);
  assert.match(zh, /手机上能玩/);
  assert.match(en, /data-filter="short"/);
  assert.match(en, /data-filter="phone"/);
  assert.match(en, /data-filter="runtime"/);
  assert.match(en, /No catalog entries match these fields/);
  assert.match(zh, /没有目录条目匹配这些字段/);
  assert.equal(en.includes("visual||"), false);
  assert.doesNotMatch(en, /"quality"/);
});

test("detail fit blocks quote duration only when the catalog has it", () => {
  const catalog = loadCatalog();
  const picks = selectStartHere(catalog.games);
  const bySlot = Object.fromEntries(picks.map((pick) => [pick.slot, pick]));
  const cases = [
    ["en", "pulp-panic-1320", "arcade", "swipe-combo arcade", false],
    ["zh", "pulp-panic-1320", "arcade", "滑动连击街机", false],
    ["en", "mirage-1301", "short", "About ten minutes", false],
    ["en", "the-last-rune-1308", "runtime", "raw WebGPU", true],
    ["en", "sightline-1317", "caveat", "Wireframe on purpose", true],
    ["zh", "sightline-1317", "caveat", "线框", true],
  ];
  for (const [locale, slug, slot, needle, isSkip] of cases) {
    const file = path.join(baseline, locale, "games", `${slug}.html`);
    const html = patchDetail(
      fs.readFileSync(file, "utf8"),
      game(slug, catalog),
      bySlot[slot],
      catalog.games,
      locale,
    );
    assert.match(html, /id="fit"/);
    assert.match(html, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(`/${locale}/#start`));
    assert.match(html, /\/en\/games\/browser-ai-games\//);
    assert.match(html, /id="catalog-related"/);
    const baselineHtml = fs.readFileSync(file, "utf8");
    if (!baselineHtml.includes('id="catalog-related"')) {
      assert.match(html, /Neighboring catalog ids|相邻的目录编号/);
    } else {
      assert.equal((html.match(/id="catalog-related"/g) || []).length, 1);
    }
    assert.equal(html.includes("players also liked"), false);
    assert.equal(html.includes("玩家也喜欢"), false);
    if (!isSkip) assert.equal(html.includes("quality"), false);
    if (slug === "pulp-panic-1320") {
      const fit = html.slice(html.indexOf('id="fit"'), html.indexOf("</aside>"));
      assert.equal(/\b\d+\s*minutes\b|未记录时长|does not record/i.test(fit), false);
    }
  }
});

test("the homepage script uses the same field rules as the module", () => {
  const catalog = loadCatalog();
  const picks = selectStartHere(catalog.games);
  const html = patchHomepage(
    fs.readFileSync(path.join(baseline, "en/index.html"), "utf8"),
    picks,
    "en",
  );
  const start = html.indexOf("function catalogBlob");
  const end = html.indexOf("function apply");
  const intentMatch = new Function(`${html.slice(start, end)}\nreturn intentMatch;`)();
  const short = catalog.games.filter((item) => intentMatch(item, "short")).map((item) => item.slug);
  assert.deepEqual(short.sort(), catalog.games.filter(isShortSession).map((item) => item.slug).sort());
  assert.equal(intentMatch(game("sparkmine-1216", catalog), "runtime"), true);
  assert.equal(intentMatch(game("pulp-panic-1320", catalog), "short"), false);
  assert.equal(intentMatch(game("pulp-panic-1320", catalog), "phone"), false);
  assert.equal(intentMatch(game("quizlight-1303", catalog), "phone"), false);
  assert.equal(intentMatch(game("topkapi-gecesi-1252", catalog), "phone"), true);
});

test("apply script writes both locales without dropping passthrough routes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "start-here-"));
  const run = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/apply-start-here.cjs"),
      "--catalog",
      catalogPath,
      "--baseline",
      baseline,
      "--out",
      dir,
    ],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const en = fs.readFileSync(path.join(dir, "en/index.html"), "utf8");
  const zh = fs.readFileSync(path.join(dir, "zh/index.html"), "utf8");
  assert.ok(en.indexOf('id="start"') < en.indexOf("Catalog updated"));
  assert.ok(zh.indexOf('id="start"') < zh.indexOf("正式目录更新"));
  assert.equal(fs.readFileSync(path.join(dir, "llms.txt"), "utf8"), fs.readFileSync(path.join(baseline, "llms.txt"), "utf8"));
  assert.equal(
    fs.readFileSync(path.join(dir, "en/games/browser-ai-games/index.html"), "utf8"),
    fs.readFileSync(path.join(baseline, "en/games/browser-ai-games.html"), "utf8"),
  );
  const report = JSON.parse(fs.readFileSync(path.join(dir, "start-here-selection.json"), "utf8"));
  assert.equal(report.catalogCount, 1321);
  assert.equal(report.catalogUpdated, "2026-11-14");
});
