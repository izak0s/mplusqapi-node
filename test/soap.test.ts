import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildEnvelope,
  escapeXml,
  parseEnvelopeBody,
  serializeString,
  serializeBoolean,
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
