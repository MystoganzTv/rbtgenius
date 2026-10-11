/**
 * translate-questions.mjs
 * Translates RBT concept fields using LibreTranslate (free, no API key).
 *
 * Usage:
 *   node scripts/translate-questions.mjs
 *
 * Output: shared/questions/question-translations-es.json
 * Saves progress every 10 concepts — safe to re-run if interrupted.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { questionConceptLookup } from "../shared/questions/question-bank.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const OUTPUT_PATH = join(ROOT, "shared/questions/question-translations-es.json");

// Public LibreTranslate instances
const LIBRE_URLS = [
  "https://libretranslate.com/translate",
  "https://translate.argosopentech.com/translate",
  "https://libretranslate.de/translate",
];

// ABA technical terms to preserve in English
const PROTECTED = [
  "RBT","BCBA","ABA","DTT","NET","VB-MAPP","PECS","FBA","ABC","MSWO",
  "DRO","DRA","DRI","NCR","FCT","IOA","SD",
];

function protectTerms(text) {
  const map = {};
  let result = text;
  PROTECTED.forEach((term, i) => {
    const ph = `TERM${i}X`;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`, "gi");
    if (re.test(result)) {
      map[ph] = term;
      result = result.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"gi"), ph);
    }
  });
  return { text: result, map };
}

function restoreTerms(text, map) {
  let r = text;
  for (const [ph, orig] of Object.entries(map)) r = r.replace(new RegExp(ph,"g"), orig);
  return r;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translateText(text, retries = 3) {
  if (!text?.trim()) return text;
  const { text: protected_, map } = protectTerms(text);
  for (const url of LIBRE_URLS) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: protected_, source: "en", target: "es", format: "text" }),
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) { await sleep(1500); continue; }
        const data = await res.json();
        const translated = data.translatedText || data.translated_text || "";
        if (translated) return restoreTerms(translated, map);
      } catch { await sleep(1500); }
    }
  }
  console.warn(`  ⚠ Could not translate: "${text.slice(0,60)}..."`);
  return text;
}

// Parse concept blocks from the JS source using a state machine
async function main() {
  console.log("RBT Genius — Question Translator (LibreTranslate, free)");
  console.log("=".repeat(55));

  const concepts = Object.values(questionConceptLookup);
  console.log(`\nParsed ${concepts.length} concepts from question bank`);

  if (concepts.length === 0) {
    console.error("No concepts found — check the parser");
    process.exit(1);
  }

  // Load existing progress
  let translations = {};
  if (existsSync(OUTPUT_PATH)) {
    try {
      translations = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
      console.log(`Resuming: ${Object.keys(translations).length}/${concepts.length} already done`);
    } catch { console.log("Starting fresh"); }
  }

  const remaining = concepts.filter(c => !translations[c.id]);
  if (remaining.length === 0) { console.log("\n✅ All concepts already translated!"); return; }
  console.log(`Translating ${remaining.length} remaining...\n`);

  // Test connection
  process.stdout.write("Testing LibreTranslate... ");
  const test = await translateText("Hello");
  if (test === "Hello") {
    console.error("\n❌ LibreTranslate unavailable. Check your internet connection and try again.");
    process.exit(1);
  }
  console.log(`✓ ("Hello" → "${test}")\n`);

  let done = 0;
  const start = Date.now();

  for (const concept of remaining) {
    process.stdout.write(`[${done+1}/${remaining.length}] ${concept.id}... `);
    try {
      const answerEs  = await translateText(concept.answer || "");  await sleep(250);
      const purposeEs = concept.purpose    ? await translateText(concept.purpose)    : ""; await sleep(250);
      const defEs     = concept.definition ? await translateText(concept.definition) : ""; await sleep(250);
      const scenarioEs= concept.scenario   ? await translateText(concept.scenario)   : ""; await sleep(250);
      const explainEs = concept.explanation? await translateText(concept.explanation) : ""; await sleep(250);

      translations[concept.id] = {
        status: "draft_machine",
        answer: answerEs,
        definition: defEs,
        scenario: scenarioEs,
        purpose: purposeEs,
        explanation: explainEs,
      };
      done++;
      process.stdout.write("✓\n");
    } catch(e) {
      process.stdout.write(`✗ (${e.message})\n`);
    }

    if (done % 10 === 0) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
      const elapsed = (Date.now()-start)/1000;
      const eta = Math.round((remaining.length-done) / Math.max(done/elapsed, 0.1));
      console.log(`  → Saved (${Object.keys(translations).length} total, ETA ~${eta}s)`);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
  console.log(`\n✅ Done! ${Object.keys(translations).length}/${concepts.length} concepts translated`);
  console.log(`\nNext steps:`);
  console.log(`  npm run sync:questions`);
  console.log(`  git add shared/questions/question-translations-es.json`);
  console.log(`  git commit -m "feat: Spanish question translations (draft_machine)"`);
  console.log(`  git push`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
