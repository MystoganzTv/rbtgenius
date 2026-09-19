import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarRevenueRange,
  shiftRevenueSelection,
} from "../src/lib/revenue-periods.js";
import { buildOwnerMetrics } from "../server/lib/owner-metrics.js";
const today = "2026-09-19";

test("month selection uses calendar boundaries, including leap years and the current partial month", () => {
  assert.deepEqual(calendarRevenueRange("specific-month", "2024-02", today), {
    range: "custom",
    start: "2024-02-01",
    end: "2024-02-29",
    page: 1,
  });
  assert.equal(
    calendarRevenueRange("specific-month", "2026-02", today).end,
    "2026-02-28",
  );
  assert.equal(
    calendarRevenueRange("specific-month", "2026-09", today).end,
    today,
  );
  assert.equal(calendarRevenueRange("specific-month", "2026-10", today), null);
  assert.equal(calendarRevenueRange("specific-month", "2026-13", today), null);
});

test("day selection rejects invalid and future days; arrow navigation crosses calendar boundaries", () => {
  assert.deepEqual(calendarRevenueRange("day", "2026-09-01", today), {
    range: "custom",
    start: "2026-09-01",
    end: "2026-09-01",
    page: 1,
  });
  assert.equal(calendarRevenueRange("day", "2026-02-30", today), null);
  assert.equal(calendarRevenueRange("day", "2026-09-20", today), null);
  assert.equal(shiftRevenueSelection("day", "2024-03-01", -1), "2024-02-29");
  assert.equal(
    shiftRevenueSelection("specific-month", "2026-01", -1),
    "2025-12",
  );
  assert.equal(
    shiftRevenueSelection("specific-month", "2025-12", 1),
    "2026-01",
  );
});

test("six-month overview drills into a month and day while preserving revenue and payment counts", () => {
  const payments = [
    {
      id: "a",
      provider: "stripe",
      status: "completed",
      amount: 10,
      payment_date: "2026-08-15T10:00:00Z",
    },
    {
      id: "b",
      provider: "revenuecat",
      status: "completed",
      amount: 20,
      payment_date: "2026-08-15T21:00:00Z",
    },
    {
      id: "c",
      provider: "stripe",
      status: "completed",
      amount: 30,
      payment_date: "2026-09-01T00:00:00Z",
    },
  ];
  const build = (options) =>
    buildOwnerMetrics({
      now: new Date(`${today}T12:00:00Z`),
      payments,
      options,
    });
  const sixMonths = build({ range: "6m" });
  assert.equal(sixMonths.history.length, 6);
  assert.equal(sixMonths.history[0].key, "2026-04");
  const august = sixMonths.history.find((row) => row.key === "2026-08");
  assert.equal(august.total, 30);
  assert.equal(august.transactions, 2);
  const month = build(
    calendarRevenueRange("specific-month", august.key, today),
  );
  assert.equal(month.history.length, 31);
  assert.equal(month.money.customerGross, august.total);
  const day = build(calendarRevenueRange("day", "2026-08-15", today));
  assert.equal(day.history.length, 1);
  assert.equal(day.money.customerGross, 30);
  assert.equal(day.transactions.total, 2);
  assert.equal(build({ range: "12m" }).history.length, 12);
});
