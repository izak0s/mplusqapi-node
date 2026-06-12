import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseEnvelopeBody } from '../src/soap';
import * as S from '../src/generated/serializer';
import * as D from '../src/generated/deserializer';

test('serializeCreateOrderV3Request emits inherited and nested fields', () => {
  const xml = S.serializeCreateOrderV3Request(
    {
      idempotencyKey: 'key-1',
      order: {
        extOrderId: 'ext-9',
        lineList: [{ articleNumber: 42, data: { quantity: 2, price: 1250 } }],
      },
      prepay: false,
    },
    'request',
  );
  // idempotencyKey comes from the IdempotentReq base type (complexContent/extension)
  assert.ok(xml.includes('<ns1:idempotencyKey>key-1</ns1:idempotencyKey>'));
  assert.ok(xml.includes('<ns1:extOrderId>ext-9</ns1:extOrderId>'));
  assert.ok(xml.includes('<ns1:lineList><ns1:line>'));
  assert.ok(xml.includes('<ns1:articleNumber>42</ns1:articleNumber>'));
  assert.ok(xml.includes('<ns1:price>1250</ns1:price>'));
  assert.ok(xml.includes('<ns1:prepay>false</ns1:prepay>'));
  // omitted Input<T> fields must not appear at all
  assert.ok(!xml.includes('orderId'));
  assert.ok(!xml.includes('paymentList'));
});

test('getRelationResponse round-trip: XML → parse → typed object', () => {
  const xml =
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:mplusqapi">' +
    '<SOAP-ENV:Body><ns1:getRelationResponse>' +
    '<ns1:result>GET-RELATION-RESULT-OK</ns1:result>' +
    '<ns1:relation>' +
    '<ns1:relationNumber>42</ns1:relationNumber>' +
    '<ns1:name>Acme &amp; Co</ns1:name>' +
    '<ns1:active>true</ns1:active>' +
    '<ns1:categoryIds><ns1:category>7</ns1:category></ns1:categoryIds>' +
    '</ns1:relation>' +
    '</ns1:getRelationResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';

  const parsed = parseEnvelopeBody(xml);
  assert.ok('data' in parsed);
  const resp = D.deserializeGetRelationResponse(
    parsed.data['getRelationResponse'] as Record<string, unknown>,
  );

  assert.equal(resp.result, 'GET-RELATION-RESULT-OK');
  assert.ok(resp.relation, 'relation present on OK result');
  assert.equal(resp.relation.relationNumber, 42);
  assert.equal(resp.relation.name, 'Acme & Co');
  assert.equal(resp.relation.active, true);
  // single-element list wrapper coerced to array
  assert.deepEqual(resp.relation.categoryIds, [7]);
  // absent list-wrapper fields default to [] (never undefined)
  assert.deepEqual(resp.relation.imageList, []);
  assert.deepEqual(resp.relation.contactList, []);
});

test('xsd:decimal fields survive as exact strings end-to-end', () => {
  const xml =
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:mplusqapi">' +
    '<SOAP-ENV:Body><ns1:wrapper>' +
    '<ns1:lineNumber>1</ns1:lineNumber>' +
    '<ns1:articleNumber>10</ns1:articleNumber>' +
    '<ns1:quantity>2.000</ns1:quantity>' +
    '<ns1:priceIncl>12.50</ns1:priceIncl>' +
    '<ns1:priceExcl>10.3306</ns1:priceExcl>' +
    '<ns1:amountIncl>25.00</ns1:amountIncl>' +
    '<ns1:amountExcl>20.6612</ns1:amountExcl>' +
    '<ns1:frequency>CONTRACT-FREQUENCY-MONTH</ns1:frequency>' +
    '</ns1:wrapper></SOAP-ENV:Body></SOAP-ENV:Envelope>';

  const parsed = parseEnvelopeBody(xml);
  assert.ok('data' in parsed);
  const line = D.deserializeSalesLineContractLine(
    parsed.data['wrapper'] as Record<string, unknown>,
  );

  // trailing zeros preserved — the parser must not coerce to float
  assert.equal(line.quantity, '2.000');
  assert.equal(line.priceIncl, '12.50');
  assert.equal(line.amountIncl, '25.00');
  // integer fields still become numbers
  assert.equal(line.lineNumber, 1);
});
