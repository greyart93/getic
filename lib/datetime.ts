/**
 * Date formatting helpers — CLIENT-SIDE ONLY.
 *
 * All formatting must happen in the browser so the displayed time matches the
 * viewer's own timezone. Never use these on the server (Vercel runs in UTC,
 * which was the cause of wrong times on deployed tickets).
 *
 * The API returns raw ISO 8601 UTC strings (e.g. "2026-09-22T10:30:00.000Z");
 * `new Date(...)` on the client converts them to the local timezone automatically.
 */

const DATE_ONLY_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
}

/** Format a date value as e.g. "22 Sep 2026" in the viewer's local timezone. */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', DATE_ONLY_OPTS)
}

/** Format a date value as e.g. "22 Sep 2026, 04:30 pm" in the viewer's local timezone. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', DATE_TIME_OPTS)
}
