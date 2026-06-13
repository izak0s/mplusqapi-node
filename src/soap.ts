import { XMLParser } from 'fast-xml-parser';

export const NS_SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
export const NS_TNS = 'urn:mplusqapi';
export const NS_PREFIX = 'ns1';

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

export function buildEnvelope(operationName: string, bodyXml: string): string {
  const inner = bodyXml.length > 0
    ? `<${NS_PREFIX}:${operationName}>${bodyXml}</${NS_PREFIX}:${operationName}>`
    : `<${NS_PREFIX}:${operationName}/>`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="${NS_SOAP}" xmlns:${NS_PREFIX}="${NS_TNS}">` +
    `<SOAP-ENV:Header/>` +
    `<SOAP-ENV:Body>${inner}</SOAP-ENV:Body>` +
    `</SOAP-ENV:Envelope>`
  );
}

const responseParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  // Keep all leaf values as raw strings: the generated deserializers coerce
  // each field explicitly. Letting the parser guess would corrupt xsd:decimal
  // values ("12.50" -> 12.5) and numeric-looking string IDs.
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: () => false,
});

export interface SoapFault {
  faultcode: string;
  faultstring: string;
  detail?: string;
}

export function parseEnvelopeBody(xml: string): { data: Record<string, unknown> } | { fault: SoapFault } {
  const parsed = responseParser.parse(xml) as Record<string, unknown>;
  const envelope = parsed['Envelope'] as Record<string, unknown> | undefined;
  const body = envelope?.['Body'] as Record<string, unknown> | undefined;

  if (!body) {
    throw new Error('Missing SOAP Body in response');
  }

  const fault = body['Fault'] as Record<string, unknown> | undefined;
  if (fault) {
    return {
      fault: {
        faultcode: stripNs(String(fault['faultcode'] ?? '')),
        faultstring: String(fault['faultstring'] ?? ''),
        detail: fault['detail'] !== undefined ? String(fault['detail']) : undefined,
      },
    };
  }

  return { data: body };
}

function stripNs(value: string): string {
  const idx = value.indexOf(':');
  return idx >= 0 ? value.slice(idx + 1) : value;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function serializeString(elemName: string, value: string): string {
  return `<${NS_PREFIX}:${elemName}>${escapeXml(value)}</${NS_PREFIX}:${elemName}>`;
}

export function serializeNumber(elemName: string, value: number): string {
  return `<${NS_PREFIX}:${elemName}>${value}</${NS_PREFIX}:${elemName}>`;
}

export function serializeBoolean(elemName: string, value: boolean): string {
  return `<${NS_PREFIX}:${elemName}>${value ? 'true' : 'false'}</${NS_PREFIX}:${elemName}>`;
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
  const p = zonedPartsOf(value, activeTimeZone);
  return (
    `<${NS_PREFIX}:${elemName}>` +
    `<${NS_PREFIX}:day>${p.day}</${NS_PREFIX}:day>` +
    `<${NS_PREFIX}:mon>${p.mon}</${NS_PREFIX}:mon>` +
    `<${NS_PREFIX}:year>${p.year}</${NS_PREFIX}:year>` +
    `</${NS_PREFIX}:${elemName}>`
  );
}

export function deserializeDateTime(obj: Record<string, unknown>): Date {
  return zonedToUtc(
    Number(obj['year']), Number(obj['mon']), Number(obj['day']),
    Number(obj['hour']), Number(obj['min']), Number(obj['sec']),
    activeTimeZone,
  );
}

export function deserializeDate(obj: Record<string, unknown>): Date {
  // Date-only struct carries no time — anchor to midnight in the active zone.
  return zonedToUtc(
    Number(obj['year']), Number(obj['mon']), Number(obj['day']),
    0, 0, 0, activeTimeZone,
  );
}

export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
