const fixedMonthDays = ["01-01", "04-23", "05-01", "05-19", "07-15", "08-30", "10-29"];

// Proje dönemi için Diyanet ve kamu ihale takvimlerinde yayımlanan dinî bayram günleri.
// Arife günleri yarım gün olduğundan tam iş günü hesabından düşülmez.
const movableHolidays = {
  2026: ["2026-03-20", "2026-03-21", "2026-03-22", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30"],
  2027: ["2027-03-09", "2027-03-10", "2027-03-11", "2027-05-16", "2027-05-17", "2027-05-18", "2027-05-19"],
};

const istanbulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarParts(value) {
  if (typeof value === "string") {
    const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    const local = value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (local) return { year: Number(local[3]), month: Number(local[2]), day: Number(local[1]) };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(istanbulDateFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function toUtcCalendarDate(value) {
  const parts = calendarParts(value);
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== parts.month - 1 || date.getUTCDate() !== parts.day) return null;
  return date;
}

function turkishHolidaySet(firstYear, lastYear) {
  const dates = new Set();
  for (let year = firstYear; year <= lastYear; year += 1) {
    fixedMonthDays.forEach((monthDay) => dates.add(`${year}-${monthDay}`));
    (movableHolidays[year] || []).forEach((date) => dates.add(date));
  }
  return dates;
}

export function calculateInternshipDays(startInput, endInput, weekdays = [1, 2, 3, 4, 5], extraHolidays = []) {
  const start = toUtcCalendarDate(startInput);
  const end = toUtcCalendarDate(endInput);
  if (!start || !end || start > end) return 0;
  const holidaySet = turkishHolidaySet(start.getUTCFullYear(), end.getUTCFullYear());
  extraHolidays.forEach((date) => {
    const holiday = toUtcCalendarDate(date);
    if (holiday) holidaySet.add(holiday.toISOString().slice(0, 10));
  });
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
  const first = toUtcCalendarDate(firstInput);
  const second = toUtcCalendarDate(secondInput);
  if (!first || !second) return null;
  return Math.floor((second.getTime() - first.getTime()) / 86_400_000);
}
