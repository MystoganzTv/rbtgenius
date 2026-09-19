import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebar = await readFile(new URL("../src/components/layout/Sidebar.jsx", import.meta.url), "utf8");
const mobile = await readFile(new URL("../src/components/layout/MobileLayout.jsx", import.meta.url), "utf8");
const ownerDashboard = await readFile(new URL("../src/pages/OwnerDashboard.jsx", import.meta.url), "utf8");

for (const [surface, source] of [["desktop", sidebar], ["mobile", mobile]]) {
  test(`${surface} admin navigation places Business Metrics below Members`, () => {
    const members = source.indexOf('{ name: "Members"');
    const metrics = source.indexOf('{ name: "Business Metrics"');
    assert.notEqual(members, -1);
    assert.notEqual(metrics, -1);
    assert.ok(members < metrics);
    assert.match(source, /Business Metrics[^\n]+OwnerDashboard[^\n]+PRIVATE/);
  });
}

test("owner dashboard uses the Business Metrics name", () => {
  assert.match(ownerDashboard, />\s*Business Metrics\s*<\/h1>/);
  assert.doesNotMatch(ownerDashboard, />Business & product health<\/h1>/);
});
