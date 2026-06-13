import { NS_PREFIX } from './soap';

/** Default IANA zone the MplusKASSA backend operates in. */
export const DEFAULT_TIME_ZONE = 'Europe/Amsterdam';

/**
 * IANA time zone used to interpret/emit the API's wall-clock date structs.
 * Module-level because the generated (de)serializers call the date helpers
 * with no per-call context. Set once at client construction via setTimeZone().
 * Note: a single zone is active per process — constructing multiple clients
 * with different timezones is not supported.
 */
let activeTimeZone = DEFAULT_TIME_ZONE;

export function setTimeZone(tz: string): void {
  // Throws RangeError on an invalid zone — surface it at construction time.
  new Intl.DateTimeFormat('en-US', { timeZone: tz });
  activeTimeZone = tz;
}

export function getTimeZone(): string {
  return activeTimeZone;
}

/** Offset (ms) of `tz` from UTC at the given instant. Positive = east of UTC. */
function zoneOffsetMs(instant: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(instant))) {
    if (p.type !== 'literal') m[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return asUTC - instant;
}

/** Wall-clock components in `tz` → the UTC instant they denote. */
function zonedToUtc(
  year: number, mon: number, day: number,
  hour: number, min: number, sec: number, tz: string,
): Date {
  const guess = Date.UTC(year, mon - 1, day, hour, min, sec);
  // Two passes converge across DST boundaries (offset depends on the instant).
  const off1 = zoneOffsetMs(guess, tz);
  const off2 = zoneOffsetMs(guess - off1, tz);
  return new Date(guess - off2);
}

interface ZonedParts {
  year: number; mon: number; day: number;
  hour: number; min: number; sec: number;
}

/** Wall-clock components of an instant rendered in `tz`. */
function zonedPartsOf(date: Date, tz: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') m[p.type] = Number(p.value);
  }
  return { year: m.year, mon: m.month, day: m.day, hour: m.hour, min: m.minute, sec: m.second };
}

/** True if `tz` is observing daylight saving at the given instant. */
function isDstAt(instant: number, tz: string): boolean {
  const year = new Date(instant).getUTCFullYear();
  const janOff = zoneOffsetMs(Date.UTC(year, 0, 1), tz);
  const julOff = zoneOffsetMs(Date.UTC(year, 6, 1), tz);
  const standardOff = Math.min(janOff, julOff);
  return zoneOffsetMs(instant, tz) !== standardOff;
}

export function serializeDateTime(elemName: string, value: Date): string {
  const tz = activeTimeZone;
  const p = zonedPartsOf(value, tz);
  const tzOffset = zoneOffsetMs(value.getTime(), tz) / 60000;
  return (
    `<${NS_PREFIX}:${elemName}>` +
    `<${NS_PREFIX}:sec>${p.sec}</${NS_PREFIX}:sec>` +
    `<${NS_PREFIX}:min>${p.min}</${NS_PREFIX}:min>` +
    `<${NS_PREFIX}:hour>${p.hour}</${NS_PREFIX}:hour>` +
    `<${NS_PREFIX}:day>${p.day}</${NS_PREFIX}:day>` +
    `<${NS_PREFIX}:mon>${p.mon}</${NS_PREFIX}:mon>` +
    `<${NS_PREFIX}:year>${p.year}</${NS_PREFIX}:year>` +
    `<${NS_PREFIX}:isdst>${isDstAt(value.getTime(), tz)}</${NS_PREFIX}:isdst>` +
    `<${NS_PREFIX}:timezone>${tzOffset}</${NS_PREFIX}:timezone>` +
    `</${NS_PREFIX}:${elemName}>`
  );
}

export function serializeDate(elemName: string, value: Date): string {
  // Date-only fields are calendar dates with no time/zone. We read the UTC
  // components so values round-trip with deserializeDate (which builds a
  // UTC-midnight Date). Construct outbound date-only values accordingly,
  // e.g. `new Date('2018-06-18')` or `new Date(Date.UTC(y, m - 1, d))`.
  return (
    `<${NS_PREFIX}:${elemName}>` +
    `<${NS_PREFIX}:day>${value.getUTCDate()}</${NS_PREFIX}:day>` +
    `<${NS_PREFIX}:mon>${value.getUTCMonth() + 1}</${NS_PREFIX}:mon>` +
    `<${NS_PREFIX}:year>${value.getUTCFullYear()}</${NS_PREFIX}:year>` +
    `</${NS_PREFIX}:${elemName}>`
  );
}

export function deserializeDateTime(obj: Record<string, unknown>): Date {
  const year = Number(obj['year']);
  const mon = Number(obj['mon']);
  const day = Number(obj['day']);
  const hour = Number(obj['hour']);
  const min = Number(obj['min']);
  const sec = Number(obj['sec']);

  // SoapMplusDateTime carries its own UTC offset (minutes, east-positive).
  // Prefer it — exact and independent of host/config. Fall back to the
  // configured zone only when the struct omits it.
  const tzRaw = obj['timezone'];
  if (tzRaw !== undefined && tzRaw !== null && tzRaw !== '') {
    const offsetMin = Number(tzRaw);
    if (!Number.isNaN(offsetMin)) {
      return new Date(Date.UTC(year, mon - 1, day, hour, min, sec) - offsetMin * 60000);
    }
  }
  return zonedToUtc(year, mon, day, hour, min, sec, activeTimeZone);
}

export function deserializeDate(obj: Record<string, unknown>): Date {
  // SoapMplusDate is a calendar date — no time, no offset. Anchor to UTC
  // midnight so it renders as the intended date with no local/UTC off-by-one.
  // Read it with the UTC accessors or `.toISOString().slice(0, 10)`.
  return new Date(Date.UTC(Number(obj['year']), Number(obj['mon']) - 1, Number(obj['day'])));
}
