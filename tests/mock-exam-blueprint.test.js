import assert from "node:assert/strict";
import test from "node:test";

/**
 * The mock exam blueprint once carried invented weights (A 18%, B 12%, C 24%,
 * D 20%, E 14%, F 12%) that appear in no BACB document. Ethics ran at 11.8%
 * against an official 15%, so every practice exam under-tested the domain that
 * grew most in the 3rd edition. Nothing caught it because nothing pinned the
 * blueprint to the real thing.
 *
 * Official scored-item counts, RBT Test Content Outline (3rd ed.): 75 scored
 * questions split A 13, B 8, C 19, D 14, E 10, F 11. A mock exam is 85 items
 * (75 scored + 10 pilot), so the shares — not the raw counts — are what match.
 */
const OFFICIAL_SCORED = { A: 13, B: 8, C: 19, D: 14, E: 10, F: 11 };
const OFFICIAL_TOTAL = 85;
const TOLERANCE_POINTS = 1.5;

const COPIES = {
  web: "../src/lib/questions/question-bank.js",
  shared: "../shared/questions/question-bank.js",
  mobile: "../mobile/src/lib/questions/question-bank.js",
};

const EXPECTED_LABELS = {
  measurement: "Data Collection and Graphing",
  assessment: "Behavior Assessment",
  skill_acquisition: "Behavior Acquisition",
  behavior_reduction: "Behavior Reduction",
  documentation: "Documentation and Reporting",
  professional_conduct: "Ethics",
};

async function load(relative) {
  return import(new URL(relative, import.meta.url).href);
}

function sectionCounts(exam) {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const question of exam) counts[question.task_list_section] += 1;
  return counts;
}

for (const [name, path] of Object.entries(COPIES)) {
  test(`${name}: mock exam matches the official domain weights`, async () => {
    const bank = await load(path);
    const exam = bank.buildMockExamQuestionSet(OFFICIAL_TOTAL, null, `blueprint-${name}`);

    assert.equal(exam.length, OFFICIAL_TOTAL);
    assert.equal(new Set(exam.map((q) => q.id)).size, OFFICIAL_TOTAL, "repeated question in one exam");

    const counts = sectionCounts(exam);
    const scoredTotal = Object.values(OFFICIAL_SCORED).reduce((a, b) => a + b, 0);

    for (const [section, scored] of Object.entries(OFFICIAL_SCORED)) {
      const actual = (counts[section] / OFFICIAL_TOTAL) * 100;
      const official = (scored / scoredTotal) * 100;
      assert.ok(
        Math.abs(actual - official) <= TOLERANCE_POINTS,
        `${section}: ${actual.toFixed(1)}% vs official ${official.toFixed(1)}% ` +
          `(off by more than ${TOLERANCE_POINTS} points)`,
      );
    }
  });

  test(`${name}: domain labels follow the 3rd edition outline`, async () => {
    const bank = await load(path);
    assert.deepEqual(bank.topicLabels, EXPECTED_LABELS);
  });
}

test("all three copies of the bank produce the same blueprint", async () => {
  const shapes = [];
  for (const path of Object.values(COPIES)) {
    const bank = await load(path);
    shapes.push(sectionCounts(bank.buildMockExamQuestionSet(OFFICIAL_TOTAL, null, "same-seed")));
  }
  // The banks differ slightly in content (mobile carries 9 extra questions), but
  // the section shape of an exam must not.
  assert.deepEqual(shapes[1], shapes[0], "shared/ drifted from the web bank");
  assert.deepEqual(shapes[2], shapes[0], "mobile/ drifted from the web bank");
});
