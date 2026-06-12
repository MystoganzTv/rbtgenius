#!/usr/bin/env node
/**
 * i18n regression guard.
 *
 * Fails (exit 1) if:
 *  1. Any string literal passed to t("...") / translateUi("...") in src/ is
 *     missing from UI_TRANSLATIONS (it would fall back to the word-by-word
 *     machine translator and produce low-quality Spanish).
 *  2. Any practice question or answer option falls back to English when the
 *     app language is Spanish.
 *  3. The web and mobile copies of question-translations-es.json diverge.
 *
 * Run: npm run check:i18n
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function fail(msg) {
  failures += 1;
  console.error(`✗ ${msg}`);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// ── 1. UI literals vs UI_TRANSLATIONS ───────────────────────────────────────
const i18nSource = fs.readFileSync(path.join(root, "src/lib/i18n.js"), "utf8");
const blockStart = i18nSource.indexOf("UI_TRANSLATIONS = {");
const blockEnd = i18nSource.indexOf("\n};", blockStart);
const dictBlock = i18nSource.slice(blockStart, blockEnd);
const dictKeys = new Set(
  [...dictBlock.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) =>
    m[1].replace(/\\"/g, '"'),
  ),
);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".jsx")) yield full;
  }
}

const literalPattern = /(?:\bt|translateUi)\(\s*"((?:[^"\\]|\\.)*)"/g;
const missingUi = new Map();
for (const file of walk(path.join(root, "src"))) {
  const code = fs.readFileSync(file, "utf8");
  for (const match of code.matchAll(literalPattern)) {
    const literal = match[1].replace(/\\"/g, '"');
    if (literal.length > 1 && !dictKeys.has(literal)) {
      if (!missingUi.has(literal)) missingUi.set(literal, path.relative(root, file));
    }
  }
}

if (missingUi.size > 0) {
  fail(`${missingUi.size} UI string(s) missing from UI_TRANSLATIONS:`);
  for (const [literal, file] of missingUi) {
    console.error(`    "${literal.slice(0, 80)}" (${file})`);
  }
} else {
  ok("All t()/translateUi literals are covered by UI_TRANSLATIONS");
}

// ── 2. Question bank Spanish coverage ───────────────────────────────────────
const questions = await import(path.join(root, "src/lib/questions/index.js"));
const translations = JSON.parse(
  fs.readFileSync(path.join(root, "src/lib/questions/question-translations-es.json"), "utf8"),
);
questions.setConceptTranslations(translations);
const i18n = await import(path.join(root, "src/lib/i18n.js"));

const bank = questions.buildPracticeQuestionBank();
const SPANISH_MARKER = /¿|á|é|í|ó|ú|ñ/i;
let englishQuestions = 0;
let englishOptions = 0;
for (const question of bank) {
  const localized = i18n.localizeQuestion(question, "es");
  if (!SPANISH_MARKER.test(localized.localizedText?.primary || "")) englishQuestions += 1;
  for (const option of localized.options || []) {
    const text = option.localizedText?.primary || "";
    if (text === option.text && !SPANISH_MARKER.test(text)) englishOptions += 1;
  }
}

if (englishQuestions > 0) fail(`${englishQuestions} question(s) fall back to English in Spanish mode`);
else ok(`All ${bank.length} practice questions render in Spanish`);

if (englishOptions > 0) fail(`${englishOptions} answer option(s) fall back to English in Spanish mode`);
else ok("All answer options render in Spanish");

// ── 3. Web/mobile translation files in sync ─────────────────────────────────
const webJson = fs.readFileSync(path.join(root, "src/lib/questions/question-translations-es.json"), "utf8");
const mobileJsonPath = path.join(root, "mobile/src/lib/questions/question-translations-es.json");
if (fs.existsSync(mobileJsonPath)) {
  const mobileJson = fs.readFileSync(mobileJsonPath, "utf8");
  if (webJson !== mobileJson) fail("web and mobile question-translations-es.json have diverged");
  else ok("web and mobile question-translations-es.json are identical");
}

if (failures > 0) {
  console.error(`\ni18n check failed with ${failures} issue group(s).`);
  process.exit(1);
}
console.log("\ni18n check passed.");
