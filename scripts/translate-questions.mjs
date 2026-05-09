/**
 * translate-questions.mjs
 *
 * Translates all RBT concept fields from English to Spanish using Claude.
 * Outputs to src/lib/question-translations-es.json
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your_key node scripts/translate-questions.mjs
 *
 * The script saves progress every 5 batches so it can resume if interrupted.
 * Re-running skips concepts that already have translations.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createRequire } from "module";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../src/lib/question-translations-es.json");
const BATCH_SIZE = 20;
const SAVE_EVERY = 5; // save every N batches

const SYSTEM_PROMPT =
  "You are a professional translator specializing in Applied Behavior Analysis (ABA) and RBT certification content. " +
  "Translate the following RBT concept fields from English to Spanish. " +
  "Keep technical ABA terms in their original English form as they are commonly used in Spanish-speaking ABA communities: " +
  "reinforcement, punishment, RBT, BCBA, ABA, DTT, NET, VB-MAPP, extinction, shaping, chaining, prompting, fading, " +
  "baseline, FBA, ABC, MSWO, token economy, DRO, DRA, DRI, NCR, FCT, PECS, naturalistic teaching. " +
  "Make the translation natural and professional. " +
  "Respond ONLY with a JSON object.";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load question-bank concepts via dynamic import
  console.log("Loading question bank...");
  const qbPath = join(__dirname, "../src/lib/question-bank.js");

  // We need to load the concept lookup. Since the file has complex imports,
  // we'll extract concepts from it by parsing the exported questionConceptLookup.
  // Use a simple approach: read the file and run it via node with special env.
  let conceptLookup;
  try {
    const mod = await import(qbPath);
    conceptLookup = mod.questionConceptLookup;
  } catch (e) {
    console.error("Failed to import question-bank.js:", e.message);
    console.log("Trying alternative extraction...");
    process.exit(1);
  }

  if (!conceptLookup || Object.keys(conceptLookup).length === 0) {
    console.error("No concepts found in questionConceptLookup");
    process.exit(1);
  }

  const allConcepts = Object.values(conceptLookup);
  console.log(`Found ${allConcepts.length} concepts to translate`);

  // Load existing translations (resume support)
  let translations = {};
  if (existsSync(OUTPUT_PATH)) {
    try {
      translations = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
      const done = Object.keys(translations).length;
      console.log(`Resuming: ${done} concepts already translated`);
    } catch {
      console.log("Starting fresh translation");
    }
  }

  // Filter out already-translated concepts
  const remaining = allConcepts.filter((c) => !translations[c.id]);
  console.log(`Translating ${remaining.length} remaining concepts in batches of ${BATCH_SIZE}`);

  let batchCount = 0;
  let totalTranslated = Object.keys(translations).length;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    batchCount++;

    console.log(
      `\nBatch ${batchCount}: concepts ${i + 1}–${Math.min(i + BATCH_SIZE, remaining.length)} of ${remaining.length}`
    );

    const batchInput = {};
    for (const concept of batch) {
      batchInput[concept.id] = {
        answer: concept.answer,
        definition: concept.definition,
        scenario: concept.scenario,
        purpose: concept.purpose,
        explanation: concept.explanation,
      };
    }

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content:
              `Translate these ${batch.length} RBT concept objects from English to Spanish. ` +
              `Return a JSON object where each key is the concept ID and the value has the same fields ` +
              `(answer, definition, scenario, purpose, explanation) translated to Spanish.\n\n` +
              JSON.stringify(batchInput, null, 2),
          },
        ],
      });

      const text = response.content.find((b) => b.type === "text")?.text || "";

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`  Batch ${batchCount}: No JSON found in response`);
        continue;
      }

      const batchTranslations = JSON.parse(jsonMatch[0]);

      // Validate and merge
      let batchAdded = 0;
      for (const concept of batch) {
        const tr = batchTranslations[concept.id];
        if (
          tr &&
          tr.answer &&
          tr.definition &&
          tr.scenario &&
          tr.purpose &&
          tr.explanation
        ) {
          translations[concept.id] = {
            answer: tr.answer,
            definition: tr.definition,
            scenario: tr.scenario,
            purpose: tr.purpose,
            explanation: tr.explanation,
          };
          batchAdded++;
        } else {
          console.warn(`  Missing translation for: ${concept.id}`);
        }
      }

      totalTranslated += batchAdded;
      console.log(
        `  ✓ Translated ${batchAdded}/${batch.length} concepts (total: ${totalTranslated}/${allConcepts.length})`
      );

      const cacheRead = response.usage?.cache_read_input_tokens || 0;
      const cacheWrite = response.usage?.cache_creation_input_tokens || 0;
      if (cacheRead > 0 || cacheWrite > 0) {
        console.log(`  Cache: ${cacheRead} read, ${cacheWrite} write`);
      }
    } catch (e) {
      console.error(`  Batch ${batchCount} error:`, e.message);
    }

    // Save progress every SAVE_EVERY batches
    if (batchCount % SAVE_EVERY === 0) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
      console.log(`  Progress saved (${Object.keys(translations).length} concepts)`);
    }
  }

  // Final save
  writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
  console.log(
    `\n✅ Done! Translated ${Object.keys(translations).length}/${allConcepts.length} concepts`
  );
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
