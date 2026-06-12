import { XMLParser } from 'fast-xml-parser';

export const NS_SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
export const NS_TNS = 'urn:mplusqapi';
export const NS_PREFIX = 'ns1';

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
  const tzOffset = -value.getTimezoneOffset();
  return (
    `<${NS_PREFIX}:${elemName}>` +
    `<${NS_PREFIX}:sec>${value.getSeconds()}</${NS_PREFIX}:sec>` +
    `<${NS_PREFIX}:min>${value.getMinutes()}</${NS_PREFIX}:min>` +
    `<${NS_PREFIX}:hour>${value.getHours()}</${NS_PREFIX}:hour>` +
    `<${NS_PREFIX}:day>${value.getDate()}</${NS_PREFIX}:day>` +
    `<${NS_PREFIX}:mon>${value.getMonth() + 1}</${NS_PREFIX}:mon>` +
    `<${NS_PREFIX}:year>${value.getFullYear()}</${NS_PREFIX}:year>` +
    `<${NS_PREFIX}:isdst>false</${NS_PREFIX}:isdst>` +
    `<${NS_PREFIX}:timezone>${tzOffset}</${NS_PREFIX}:timezone>` +
    `</${NS_PREFIX}:${elemName}>`
  );
}

export function serializeDate(elemName: string, value: Date): string {
  return (
    `<${NS_PREFIX}:${elemName}>` +
    `<${NS_PREFIX}:day>${value.getDate()}</${NS_PREFIX}:day>` +
    `<${NS_PREFIX}:mon>${value.getMonth() + 1}</${NS_PREFIX}:mon>` +
    `<${NS_PREFIX}:year>${value.getFullYear()}</${NS_PREFIX}:year>` +
    `</${NS_PREFIX}:${elemName}>`
  );
}

export function deserializeDateTime(obj: Record<string, unknown>): Date {
  const d = new Date();
  d.setFullYear(Number(obj['year']), Number(obj['mon']) - 1, Number(obj['day']));
  d.setHours(Number(obj['hour']), Number(obj['min']), Number(obj['sec']), 0);
  return d;
}

export function deserializeDate(obj: Record<string, unknown>): Date {
  return new Date(Number(obj['year']), Number(obj['mon']) - 1, Number(obj['day']));
}

export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
