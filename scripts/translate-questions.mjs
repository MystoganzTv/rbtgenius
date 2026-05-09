/**
 * translate-questions.mjs
 *
 * Translates all RBT concept fields from English to Spanish using LibreTranslate
 * (100% free, no API key required).
 *
 * Usage:
 *   node scripts/translate-questions.mjs
 *
 * Saves progress every 10 concepts so it can resume if interrupted.
 * Re-running skips concepts that already have translations.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../src/lib/question-translations-es.json");

// Public LibreTranslate instances (tries each if one fails)
const LIBRETRANSLATE_URLS = [
  "https://libretranslate.com/translate",
  "https://translate.argosopentech.com/translate",
  "https://libretranslate.de/translate",
];

// ABA/RBT technical terms to keep in English
const PROTECTED_TERMS = [
  "RBT", "BCBA", "ABA", "DTT", "NET", "VB-MAPP", "PECS",
  "reinforcement", "punishment", "extinction", "shaping", "chaining",
  "prompting", "fading", "baseline", "FBA", "ABC", "MSWO",
  "DRO", "DRA", "DRI", "NCR", "FCT", "IOA",
];

// Replace protected terms with placeholders before translating
function protectTerms(text) {
  const map = {};
  let result = text;
  PROTECTED_TERMS.forEach((term, i) => {
    const placeholder = `TERM${i}`;
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    if (regex.test(result)) {
      map[placeholder] = term;
      result = result.replace(new RegExp(`\\b${term}\\b`, "gi"), placeholder);
    }
  });
  return { text: result, map };
}

function restoreTerms(text, map) {
  let result = text;
  for (const [placeholder, original] of Object.entries(map)) {
    result = result.replace(new RegExp(placeholder, "g"), original);
  }
  return result;
}

async function translateText(text, retries = 3) {
  const { text: protected_, map } = protectTerms(text);

  for (const url of LIBRETRANSLATE_URLS) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: protected_,
            source: "en",
            target: "es",
            format: "text",
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          if (attempt < retries - 1) await sleep(2000);
          continue;
        }

        const data = await res.json();
        const translated = data.translatedText || data.translated_text || "";
        if (!translated) continue;

        return restoreTerms(translated, map);
      } catch {
        if (attempt < retries - 1) await sleep(2000);
      }
    }
  }

  // All instances failed — return original English
  console.warn(`  ⚠ Could not translate: "${text.slice(0, 50)}..." — keeping English`);
  return text;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateConcept(concept) {
  // Small delay between requests to be polite to free servers
  const fields = ["answer", "definition", "scenario", "purpose", "explanation"];
  const result = {};

  for (const field of fields) {
    const value = concept[field];
    if (value) {
      result[field] = await translateText(value);
      await sleep(300); // 300ms between requests
    } else {
      result[field] = value;
    }
  }

  return result;
}

async function main() {
  console.log("RBT Genius — Question Translator (free, LibreTranslate)");
  console.log("=".repeat(55));

  // Load concept lookup from question bank
  console.log("\nLoading question bank...");
  const qbPath = join(__dirname, "../src/lib/question-bank.js");

  let conceptLookup;
  try {
    const mod = await import(qbPath);
    conceptLookup = mod.questionConceptLookup;
  } catch (e) {
    console.error("Failed to import question-bank.js:", e.message);
    process.exit(1);
  }

  if (!conceptLookup || Object.keys(conceptLookup).length === 0) {
    console.error("No concepts found");
    process.exit(1);
  }

  const allConcepts = Object.values(conceptLookup);
  console.log(`Found ${allConcepts.length} concepts`);

  // Load existing progress
  let translations = {};
  if (existsSync(OUTPUT_PATH)) {
    try {
      translations = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
      const done = Object.keys(translations).length;
      console.log(`Resuming: ${done}/${allConcepts.length} already translated`);
    } catch {
      console.log("Starting fresh");
    }
  }

  const remaining = allConcepts.filter((c) => !translations[c.id]);
  console.log(`Translating ${remaining.length} remaining concepts...\n`);

  if (remaining.length === 0) {
    console.log("✅ All concepts already translated!");
    return;
  }

  // Test connection first
  console.log("Testing LibreTranslate connection...");
  const test = await translateText("Hello");
  if (test === "Hello") {
    console.error("❌ LibreTranslate unavailable. Try again later or check your internet connection.");
    process.exit(1);
  }
  console.log(`✓ Connected (test: "Hello" → "${test}")\n`);

  let done = 0;
  const startTime = Date.now();

  for (const concept of remaining) {
    process.stdout.write(`[${done + 1}/${remaining.length}] ${concept.id}... `);

    try {
      const translated = await translateConcept(concept);
      translations[concept.id] = translated;
      done++;
      process.stdout.write(`✓\n`);
    } catch (e) {
      process.stdout.write(`✗ (${e.message})\n`);
    }

    // Save progress every 10 concepts
    if (done % 10 === 0) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = done / elapsed;
      const remaining_ = remaining.length - done;
      const eta = Math.round(remaining_ / rate);
      console.log(`  → Saved (${Object.keys(translations).length} total, ETA: ~${eta}s)`);
    }
  }

  // Final save
  writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
  const total = Object.keys(translations).length;
  console.log(`\n✅ Done! ${total}/${allConcepts.length} concepts translated`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log("\nNext step: git add src/lib/question-translations-es.json && git commit");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
