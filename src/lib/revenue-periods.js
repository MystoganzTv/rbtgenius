// Calendar selections become the same UTC range used by the totals and ledger.
export function calendarRevenueRange(mode, value, today) {
  if (mode === "specific-month") {
    if (!/^\d{4}-\d{2}$/.test(value || "") || value > today.slice(0, 7))
      return null;
    const first = new Date(`${value}-01T00:00:00.000Z`);
    if (
      !Number.isFinite(first.getTime()) ||
      first.toISOString().slice(0, 7) !== value
    )
      return null;
    first.setUTCMonth(first.getUTCMonth() + 1);
    first.setUTCDate(0);
    const last = first.toISOString().slice(0, 10);
    return {
      range: "custom",
      start: `${value}-01`,
      end: last > today ? today : last,
      page: 1,
    };
  }
  if (mode === "day") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "") || value > today) return null;
    const day = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(day.getTime()) ||
      day.toISOString().slice(0, 10) !== value
    )
      return null;
    return { range: "custom", start: value, end: value, page: 1 };
  }
  return null;
}

export function shiftRevenueSelection(mode, value, direction) {
  const date = new Date(
    `${value}${mode === "specific-month" ? "-01" : ""}T00:00:00.000Z`,
  );
  if (!Number.isFinite(date.getTime())) return "";
  if (mode === "specific-month")
    date.setUTCMonth(date.getUTCMonth() + direction);
  else date.setUTCDate(date.getUTCDate() + direction);
  return date.toISOString().slice(0, mode === "specific-month" ? 7 : 10);
}
