import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildEnvelope,
  escapeXml,
  parseEnvelopeBody,
  serializeString,
  serializeBoolean,
  serializeDateTime,
  serializeDate,
  deserializeDateTime,
  deserializeDate,
  setTimeZone,
  getTimeZone,
  DEFAULT_TIME_ZONE,
  toArray,
  NS_PREFIX,
} from '../src/soap';

test('buildEnvelope wraps body in SOAP 1.1 envelope', () => {
  const xml = buildEnvelope('getOrders', `<${NS_PREFIX}:request/>`);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes('<SOAP-ENV:Envelope'));
  assert.ok(xml.includes('xmlns:ns1="urn:mplusqapi"'));
  assert.ok(xml.includes(`<SOAP-ENV:Body><ns1:getOrders><ns1:request/></ns1:getOrders></SOAP-ENV:Body>`));
});

test('buildEnvelope emits self-closing operation element for empty body', () => {
  const xml = buildEnvelope('getApiVersion', '');
  assert.ok(xml.includes('<ns1:getApiVersion/>'));
});

test('escapeXml escapes all five XML entities', () => {
  assert.equal(escapeXml(`<a & "b" 'c'>`), '&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;');
});

test('serializeString escapes its value', () => {
  assert.equal(serializeString('name', 'A & B'), '<ns1:name>A &amp; B</ns1:name>');
});

test('serializeBoolean emits true/false text', () => {
  assert.equal(serializeBoolean('active', true), '<ns1:active>true</ns1:active>');
  assert.equal(serializeBoolean('active', false), '<ns1:active>false</ns1:active>');
});

test('default time zone is Europe/Amsterdam', () => {
  setTimeZone(DEFAULT_TIME_ZONE);
  assert.equal(getTimeZone(), 'Europe/Amsterdam');
});

test('setTimeZone rejects an invalid zone', () => {
  assert.throws(() => setTimeZone('Not/AZone'), RangeError);
  setTimeZone(DEFAULT_TIME_ZONE);
});

test('serializeDateTime emits wall-clock components in the active zone', () => {
  setTimeZone('Europe/Amsterdam');
  // 11:45:30 UTC == 13:45:30 in Amsterdam summer time (DST, +02:00).
  const d = new Date('2026-06-12T11:45:30.000Z');
  const xml = serializeDateTime('timestamp', d);
  assert.ok(xml.includes('<ns1:sec>30</ns1:sec>'));
  assert.ok(xml.includes('<ns1:min>45</ns1:min>'));
  assert.ok(xml.includes('<ns1:hour>13</ns1:hour>'));
  assert.ok(xml.includes('<ns1:day>12</ns1:day>'));
  assert.ok(xml.includes('<ns1:mon>6</ns1:mon>'));
  assert.ok(xml.includes('<ns1:year>2026</ns1:year>'));
  assert.ok(xml.includes('<ns1:isdst>true</ns1:isdst>'));
  assert.ok(xml.includes('<ns1:timezone>120</ns1:timezone>'));
});

test('serializeDate emits the UTC calendar date (no zone shift)', () => {
  // Date-only fields are calendar dates: UTC midnight in, UTC components out.
  const d = new Date('1999-12-31T00:00:00.000Z');
  const xml = serializeDate('financialDate', d);
  assert.ok(xml.includes('<ns1:day>31</ns1:day>'));
  assert.ok(xml.includes('<ns1:mon>12</ns1:mon>'));
  assert.ok(xml.includes('<ns1:year>1999</ns1:year>'));
});

test('deserializeDateTime honors the payload timezone offset (exact)', () => {
  // timezone is minutes east of UTC: 13:45:30 at +120 == 11:45:30 UTC.
  // Active zone is intentionally UTC to prove the payload offset wins.
  setTimeZone('UTC');
  const d = deserializeDateTime({
    year: '2026', mon: '6', day: '12', hour: '13', min: '45', sec: '30',
    isdst: 'true', timezone: '120',
  });
  assert.equal(d.toISOString(), '2026-06-12T11:45:30.000Z');
  setTimeZone(DEFAULT_TIME_ZONE);
});

test('deserializeDateTime falls back to the active zone when timezone is absent', () => {
  setTimeZone('Europe/Amsterdam');
  const d = deserializeDateTime({ year: '2026', mon: '6', day: '12', hour: '13', min: '45', sec: '30' });
  assert.equal(d.toISOString(), '2026-06-12T11:45:30.000Z');
});

test('deserializeDate returns a UTC-midnight calendar date', () => {
  const d = deserializeDate({ year: '2018', mon: '6', day: '18' });
  assert.equal(d.toISOString(), '2018-06-18T00:00:00.000Z');
  assert.equal(d.toISOString().slice(0, 10), '2018-06-18');
});

test('date-only round-trips with no off-by-one', () => {
  const original = deserializeDate({ year: '2018', mon: '6', day: '18' });
  const xml = serializeDate('financialDate', original);
  assert.ok(xml.includes('<ns1:day>18</ns1:day>'));
  assert.ok(xml.includes('<ns1:mon>6</ns1:mon>'));
  assert.ok(xml.includes('<ns1:year>2018</ns1:year>'));
});

test('datetime round-trips exactly via the emitted offset', () => {
  setTimeZone('Europe/Amsterdam');
  const original = new Date('2026-06-12T11:45:30.000Z');
  const xml = serializeDateTime('ts', original);
  const obj: Record<string, string> = {};
  for (const m of xml.matchAll(/<ns1:(\w+)>([^<]+)<\/ns1:\w+>/g)) {
    obj[m[1]] = m[2];
  }
  const round = deserializeDateTime(obj);
  assert.equal(round.toISOString(), original.toISOString());
});

test('toArray normalizes undefined, single value, and array', () => {
  assert.deepEqual(toArray(undefined), []);
  assert.deepEqual(toArray(null), []);
  assert.deepEqual(toArray('x'), ['x']);
  assert.deepEqual(toArray(['x', 'y']), ['x', 'y']);
});

test('parseEnvelopeBody returns body data and keeps leaf values as strings', () => {
  const xml =
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:mplusqapi">' +
    '<SOAP-ENV:Body><ns1:getThingResponse>' +
    '<ns1:priceIncl>12.50</ns1:priceIncl>' +
    '<ns1:extId>0042</ns1:extId>' +
    '<ns1:count>7</ns1:count>' +
    '</ns1:getThingResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';
  const parsed = parseEnvelopeBody(xml);
  assert.ok('data' in parsed);
  const resp = parsed.data['getThingResponse'] as Record<string, unknown>;
  // xsd:decimal precision and leading zeros must survive parsing
  assert.equal(resp['priceIncl'], '12.50');
  assert.equal(resp['extId'], '0042');
  assert.equal(resp['count'], '7');
});

test('parseEnvelopeBody extracts SOAP faults with namespace stripped from faultcode', () => {
  const xml =
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<SOAP-ENV:Body><SOAP-ENV:Fault>' +
    '<faultcode>SOAP-ENV:Client.ORDER_NOT_FOUND</faultcode>' +
    '<faultstring>Order not found</faultstring>' +
    '</SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>';
  const parsed = parseEnvelopeBody(xml);
  assert.ok('fault' in parsed);
  assert.equal(parsed.fault.faultcode, 'Client.ORDER_NOT_FOUND');
  assert.equal(parsed.fault.faultstring, 'Order not found');
});

test('parseEnvelopeBody throws on missing SOAP body', () => {
  assert.throws(() => parseEnvelopeBody('<foo/>'), /Missing SOAP Body/);
});
