import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ADMIN_ONLY_PAGE_KEYS, canAccessPage } from "../src/lib/page-access.js";

test("owner metrics are only accessible to admins", () => {
  assert.equal(canAccessPage("OwnerDashboard", { role: "admin" }), true);
  assert.equal(canAccessPage("OwnerDashboard", { role: "student" }), false);
  assert.equal(canAccessPage("OwnerDashboard", null), false);
});

test("member administration is only accessible to admins", () => {
  // AdminMembers can change roles and delete accounts, so it is at least as
  // sensitive as the metrics dashboard.
  assert.equal(canAccessPage("AdminMembers", { role: "admin" }), true);
  assert.equal(canAccessPage("AdminMembers", { role: "student" }), false);
  assert.equal(canAccessPage("AdminMembers", null), false);
});

test("regular app pages remain available to signed-in users", () => {
  assert.equal(canAccessPage("Dashboard", { role: "student" }), true);
  assert.equal(canAccessPage("Practice", { role: "student" }), true);
});

test("every admin-badged sidebar page is gated", async () => {
  // The gate defaults to permissive, so a new admin page that nobody adds to
  // ADMIN_ONLY_PAGES would silently stay reachable by URL. Pin the set to the
  // navigation config instead of trusting anyone to remember.
  const sidebar = await readFile(
    new URL("../src/components/layout/Sidebar.jsx", import.meta.url),
    "utf8",
  );

  const badged = [...sidebar.matchAll(/page:\s*"([^"]+)"[^}]*badge:\s*"(ADMIN|PRIVATE)"/g)]
    .map(([, page]) => page);

  assert.ok(badged.length > 0, "found no admin-badged pages in Sidebar.jsx");

  for (const page of badged) {
    assert.ok(
      ADMIN_ONLY_PAGE_KEYS.has(page),
      `${page} is badged admin-only in Sidebar.jsx but missing from ADMIN_ONLY_PAGES`,
    );
  }
});
