const fixedMonthDays = ["01-01", "04-23", "05-01", "05-19", "07-15", "08-30", "10-29"];

// Proje dönemi için Diyanet ve kamu ihale takvimlerinde yayımlanan dinî bayram günleri.
// Arife günleri yarım gün olduğundan tam iş günü hesabından düşülmez.
const movableHolidays = {
  2026: ["2026-03-20", "2026-03-21", "2026-03-22", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30"],
  2027: ["2027-03-09", "2027-03-10", "2027-03-11", "2027-05-16", "2027-05-17", "2027-05-18", "2027-05-19"],
};

function turkishHolidaySet(firstYear, lastYear) {
  const dates = new Set();
  for (let year = firstYear; year <= lastYear; year += 1) {
    fixedMonthDays.forEach((monthDay) => dates.add(`${year}-${monthDay}`));
    (movableHolidays[year] || []).forEach((date) => dates.add(date));
  }
  return dates;
}

export function calculateInternshipDays(startInput, endInput, weekdays = [1, 2, 3, 4, 5], extraHolidays = []) {
  const start = new Date(startInput);
  const end = new Date(endInput);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  const holidaySet = turkishHolidaySet(start.getUTCFullYear(), end.getUTCFullYear());
  extraHolidays.forEach((date) => holidaySet.add(new Date(date).toISOString().slice(0, 10)));
  let count = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    const iso = cursor.toISOString().slice(0, 10);
    if (weekdays.includes(cursor.getUTCDay()) && !holidaySet.has(iso)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function daysBetween(firstInput, secondInput) {
  const first = new Date(firstInput);
  const second = new Date(secondInput);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return null;
  return Math.floor((second.getTime() - first.getTime()) / 86_400_000);
}
