// Date utilities. Path Pointer tracks activity by the user's *local* calendar
// day. We accept an optional IANA timezone so the design supports proper
// per-user timezones later; when omitted we default to UTC.

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns YYYY-MM-DD for the given instant in the given timezone.
export function toLocalDateString(
  instant: Date = new Date(),
  timeZone?: string
): string {
  if (!timeZone) {
    return instant.toISOString().slice(0, 10);
  }
  // en-CA gives ISO-like YYYY-MM-DD formatting.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(instant);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

// Add (or subtract) days from a YYYY-MM-DD string, returning YYYY-MM-DD.
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const next = new Date(d.getTime() + days * DAY_MS);
  return next.toISOString().slice(0, 10);
}

// Inclusive list of date strings from start to end.
export function dateRange(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  let cur = startStr;
  // Guard against inverted ranges.
  if (startStr > endStr) return result;
  while (cur <= endStr) {
    result.push(cur);
    cur = addDays(cur, 1);
  }
  return result;
}

// Number of days difference (a - b) between two YYYY-MM-DD strings.
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((da - db) / DAY_MS);
}
